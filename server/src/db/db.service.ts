import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * Acceso a PostgreSQL (pool `pg`). El pool NO conecta hasta la primera query,
 * así que la app arranca sin BD (los tests e2e sin BD siguen funcionando); solo
 * los handlers que consultan (health, categories, …) requieren la BD viva.
 * DATABASE_URL lo inyecta docker-compose; en local por defecto apunta a localhost.
 */
@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgres://postgres:dev@localhost:5432/neatspace',
  });

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params as unknown[]);
  }

  /** Ejecuta `fn` dentro de una transacción (BEGIN/COMMIT, ROLLBACK ante error). */
  async tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  onModuleDestroy(): Promise<void> {
    return this.pool.end();
  }
}
