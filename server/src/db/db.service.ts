import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Cliente mínimo común a `pg` y a PGlite (ambos exponen query→{rows}). */
export interface DbClient {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount?: number }>;
}

/**
 * Dos motores tras la MISMA interfaz:
 *  - Con DATABASE_URL (Docker/producción): PostgreSQL real vía `pg` (+ PostGIS).
 *  - Sin DATABASE_URL (dev local, sin Docker): PostgreSQL EMBEBIDO vía PGlite (WASM),
 *    aplicando las migraciones reales con una transformación mínima (sin PostGIS).
 * Así la plataforma es funcional en tu máquina sin instalar nada.
 */
@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('DbService');
  mode: 'pg' | 'pglite' = 'pg';
  private pool?: Pool;
  private lite?: { query: DbClient['query']; exec: (sql: string) => Promise<unknown>; transaction: <T>(fn: (tx: DbClient) => Promise<T>) => Promise<T>; close: () => Promise<void> };

  async onModuleInit(): Promise<void> {
    if (process.env.DATABASE_URL) {
      this.mode = 'pg';
      this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
      this.logger.log('DB: PostgreSQL (DATABASE_URL)');
      return;
    }
    this.mode = 'pglite';
    const { PGlite } = await import('@electric-sql/pglite');
    this.lite = (await PGlite.create()) as unknown as typeof this.lite;
    await this.applyEmbeddedSchema();
    this.logger.warn(
      'DB: PGlite EMBEBIDO (dev sin Docker) — datos en memoria, se reinician al parar el server',
    );
  }

  /** Aplica migraciones + seed reales, adaptadas para PGlite (sin PostGIS/citext). */
  private async applyEmbeddedSchema(): Promise<void> {
    const dbDir = this.findDbDir();
    if (!dbDir) {
      this.logger.error('No encuentro el directorio db/ para el esquema embebido');
      return;
    }
    const migDir = resolve(dbDir, 'migrations');
    const files = readdirSync(migDir)
      .filter((f) => /^0\d+.*\.sql$/.test(f))
      .sort();
    for (const f of files) {
      await this.lite!.exec(toPglite(readFileSync(resolve(migDir, f), 'utf8')));
    }
    const seed = resolve(dbDir, 'seed.sql');
    if (existsSync(seed)) {
      await this.lite!.exec(toPglite(readFileSync(seed, 'utf8')));
    }
    this.logger.log(`Esquema embebido aplicado (${files.length} migraciones + seed)`);
  }

  private findDbDir(): string | null {
    for (const c of [
      resolve(process.cwd(), '..', 'db'),
      resolve(process.cwd(), 'db'),
      resolve(__dirname, '..', '..', '..', 'db'),
    ]) {
      if (existsSync(resolve(c, 'migrations'))) return c;
    }
    return null;
  }

  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount?: number }> {
    if (this.mode === 'pg') {
      return this.pool!.query(text, params as unknown[]) as unknown as Promise<{
        rows: T[];
        rowCount?: number;
      }>;
    }
    return this.lite!.query<T>(text, params);
  }

  /** Ejecuta `fn` dentro de una transacción (BEGIN/COMMIT, ROLLBACK ante error). */
  async tx<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
    if (this.mode === 'pglite') {
      return this.lite!.transaction(fn);
    }
    const client: PoolClient = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client as unknown as DbClient);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) await this.pool.end();
    if (this.lite) await this.lite.close();
  }
}

/** Adapta el SQL de las migraciones (PostgreSQL+PostGIS) para PGlite (sin PostGIS). */
function toPglite(sql: string): string {
  return sql
    .split('\n')
    .filter((l) => !/CREATE EXTENSION[^;]*(postgis|citext|pgcrypto)/i.test(l))
    .join('\n')
    .replace(/geometry\(Point,\s*4326\)/gi, 'jsonb') // sin PostGIS: geo como jsonb {lat,lng}
    .replace(/\bcitext\b/gi, 'text')
    .replace(/CREATE INDEX[^;]*USING gist[^;]*;/gi, '-- (índice GiST omitido en PGlite)');
}
