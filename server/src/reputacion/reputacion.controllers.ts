import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ReviewDto } from './dto';
import { ServiceAuthGuard } from '../common/service-auth.guard';
import { DbService, DbClient } from '../db/db.service';
import { currentUserId, DEMO_CLIENTE, DEMO_PROFESIONAL } from '../common/jwt';
import { assertNoControlChars } from '../common/validation';
import { bayesianScore, starToUnit } from '../domain/trust-score';
import { hashEvent } from '../domain/reputation-hash';

// Contexto Reputación (doc 07 §1). RN-5, RN-8, IN-4, IN-8.
// Prior bayesiano del Trust Score: un perfil nuevo arranca cerca de este valor y
// converge a su media real a medida que acumula evaluaciones (cold-start, doc 05 §4).
const PRIOR_MEAN = 0.75; // 75/100 de arranque
const PRIOR_STRENGTH = 5; // «peso» de N evaluaciones ficticias en el prior

/** Recomputa la proyección trust_score de un neatprofile desde sus evaluaciones (IN-7). */
async function recomputeTrustScore(c: DbClient, neatprofileId: string): Promise<{
  valor_0_100: number;
  atributos_0_100: Record<string, number>;
  n_evaluaciones: number;
  nivel_verificacion: number;
} | null> {
  const prof = await c.query<{ usuario_id: string }>(
    'SELECT usuario_id FROM neatprofile WHERE id = $1',
    [neatprofileId],
  );
  if (!prof.rows.length) return null;
  const usuarioId = prof.rows[0].usuario_id;
  const evs = await c.query<{ estrellas: number; atributos: Record<string, boolean> }>(
    'SELECT estrellas, atributos FROM evaluacion WHERE evaluado_id = $1',
    [usuarioId],
  );
  const ratings = evs.rows.map((e) => ({ s: starToUnit(Number(e.estrellas)), w: 1 }));
  const valor = bayesianScore(ratings, PRIOR_MEAN, PRIOR_STRENGTH);
  // Atributos 0–100: % de evaluaciones donde el atributo booleano fue true.
  const counts: Record<string, number> = {};
  for (const e of evs.rows) {
    for (const [k, v] of Object.entries(e.atributos ?? {})) {
      if (v === true) counts[k] = (counts[k] ?? 0) + 1;
    }
  }
  const n = evs.rows.length;
  const atributos_0_100: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) atributos_0_100[k] = Math.round((100 * v) / n);
  await c.query(
    `INSERT INTO trust_score (neatprofile_id, valor_0_100, atributos_0_100, n_evaluaciones, recalculado_en)
     VALUES ($1,$2,$3::jsonb,$4, now())
     ON CONFLICT (neatprofile_id) DO UPDATE
       SET valor_0_100 = EXCLUDED.valor_0_100,
           atributos_0_100 = EXCLUDED.atributos_0_100,
           n_evaluaciones = EXCLUDED.n_evaluaciones,
           recalculado_en = now()`,
    [neatprofileId, valor, JSON.stringify(atributos_0_100), n],
  );
  return { valor_0_100: valor, atributos_0_100, n_evaluaciones: n, nivel_verificacion: 0 };
}

@Controller('services')
export class ServicesReviewController {
  constructor(private readonly db: DbService) {}

  /** CU-29 · Evaluar (double-blind). RN-5: 409 si no pagado. Cuerpo sin 0-100. */
  @Post(':id/reviews')
  async createReview(
    @Param('id') id: string,
    @Body() b: ReviewDto,
    @Req() req: Request,
  ): Promise<unknown> {
    assertNoControlChars(b.comentario, 'comentario'); // a columna text → NUL daría 500
    const evaluador = currentUserId(req) ?? DEMO_CLIENTE;
    return this.db.tx(async (c) => {
      // El servicio ≡ acuerdo. RN-5: solo se evalúa un servicio pagado (CERRADO).
      const ac = await c.query<{ estado: string; cliente_id: string }>(
        `SELECT ac.estado, o.cliente_id
           FROM acuerdo ac JOIN oportunidad o ON o.id = ac.oportunidad_id
          WHERE ac.id = $1`,
        [id],
      );
      if (!ac.rows.length) throw new NotFoundException('servicio no encontrado');
      if (ac.rows[0].estado !== 'CERRADO') {
        throw new ConflictException('el servicio no está pagado (CERRADO); no admite evaluación');
      }
      // Faceta evaluada: el cliente evalúa al profesional y viceversa (demo: contraparte fija).
      const evaluadoEsProfesional = evaluador === ac.rows[0].cliente_id;
      const evaluado = evaluadoEsProfesional ? DEMO_PROFESIONAL : ac.rows[0].cliente_id;
      const rol = evaluadoEsProfesional ? 'profesional' : 'cliente';
      if (evaluado === evaluador) {
        throw new ConflictException('no puedes evaluarte a ti mismo');
      }

      // Insert de la evaluación. UNIQUE(servicio_id, evaluador_id) → 409 (IN-4).
      let evId: string;
      try {
        const ins = await c.query<{ id: string }>(
          `INSERT INTO evaluacion (servicio_id, evaluador_id, evaluado_id, rol_evaluado, estrellas, atributos, comentario)
           VALUES ($1,$2,$3,$4::parte_acuerdo,$5,$6::jsonb,$7) RETURNING id`,
          [id, evaluador, evaluado, rol, b.estrellas, JSON.stringify(b.atributos ?? {}), b.comentario ?? null],
        );
        evId = ins.rows[0].id;
      } catch (e) {
        const msg = String((e as { message?: string })?.message ?? '');
        if ((e as { code?: string })?.code === '23505' || /duplicate key|unique/i.test(msg)) {
          throw new ConflictException('ya evaluaste este servicio');
        }
        throw e;
      }

      // Append encadenado por hash al reputation_log del evaluado (IN-8).
      const payload = JSON.stringify({ servicio_id: id, evaluado, estrellas: b.estrellas });
      const prev = await c.query<{ h: string | null }>(
        "SELECT encode(hash_actual,'hex') AS h FROM reputation_log WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT 1",
        [evaluado],
      );
      const prevHex = prev.rows.length ? prev.rows[0].h : null;
      const hashActual = hashEvent(prevHex, payload);
      await c.query(
        `INSERT INTO reputation_log (usuario_id, evento, payload, evaluacion_id, hash_prev, hash_actual)
         VALUES ($1,'evaluacion',$2::jsonb,$3, decode($4,'hex'), decode($5,'hex'))`,
        [evaluado, payload, evId, prevHex, hashActual],
      );

      // Recomputa la proyección de Trust Score del evaluado.
      const prof = await c.query<{ id: string }>(
        'SELECT id FROM neatprofile WHERE usuario_id = $1',
        [evaluado],
      );
      const ts = prof.rows.length ? await recomputeTrustScore(c, prof.rows[0].id) : null;
      return { id: evId, rol_evaluado: rol, estrellas: b.estrellas, trust_score: ts?.valor_0_100 ?? null };
    });
  }
}

@Controller('profiles')
export class ProfilesReputationController {
  constructor(private readonly db: DbService) {}

  /** CU-30 · Trust Score derivado. RN-7/RN-8: sin datos crudos IDOR. */
  @Get(':id/trust-score')
  async getTrustScore(@Param('id') id: string): Promise<unknown> {
    const prof = await this.db.query<{ id: string }>('SELECT id FROM neatprofile WHERE id = $1', [id]);
    if (!prof.rows.length) throw new NotFoundException('perfil no encontrado');
    const ts = await this.db.query<{
      valor_0_100: number;
      atributos_0_100: Record<string, number>;
      nivel_verificacion: number;
      n_evaluaciones: number;
    }>(
      'SELECT valor_0_100, atributos_0_100, nivel_verificacion, n_evaluaciones FROM trust_score WHERE neatprofile_id = $1',
      [id],
    );
    if (!ts.rows.length) {
      // Cold-start: perfil sin evaluaciones aún → proyección con el prior.
      return {
        valor_0_100: Math.round(100 * PRIOR_MEAN),
        atributos_0_100: {},
        nivel_verificacion: 0,
        n_evaluaciones: 0,
        badge: null,
      };
    }
    const r = ts.rows[0];
    return {
      valor_0_100: Number(r.valor_0_100),
      atributos_0_100: r.atributos_0_100 ?? {},
      nivel_verificacion: Number(r.nivel_verificacion),
      n_evaluaciones: Number(r.n_evaluaciones),
      badge: null,
    };
  }

  /** CU-30 · Historial público (derivado del log). */
  @Get(':id/reputation')
  async getReputation(@Param('id') id: string): Promise<unknown[]> {
    const prof = await this.db.query<{ usuario_id: string }>(
      'SELECT usuario_id FROM neatprofile WHERE id = $1',
      [id],
    );
    if (!prof.rows.length) throw new NotFoundException('perfil no encontrado');
    const log = await this.db.query<{ id: string; evento: string; creado_en: string }>(
      'SELECT id, evento, creado_en FROM reputation_log WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT 50',
      [prof.rows[0].usuario_id],
    );
    // Historial público: sin payload crudo (RN-8), solo un resumen del tipo de evento.
    const resumen: Record<string, string> = {
      evaluacion: 'Evaluación recibida',
      sancion: 'Sanción aplicada',
      verificacion: 'Verificación de identidad',
      apelacion: 'Apelación',
      decay: 'Decaimiento temporal',
    };
    return log.rows.map((e) => ({
      id: e.id,
      evento: e.evento,
      resumen: resumen[e.evento] ?? e.evento,
      creado_en: e.creado_en,
    }));
  }
}

@Controller('internal/reputation')
@UseGuards(ServiceAuthGuard)
export class InternalReputationController {
  constructor(private readonly db: DbService) {}

  /** CU-31 · Recomputa la proyección desde el log (interno). IN-7/IN-8. */
  @Post('recompute/:profileId')
  async recompute(@Param('profileId') profileId: string): Promise<unknown> {
    const ts = await this.db.tx((c) => recomputeTrustScore(c, profileId));
    if (!ts) throw new NotFoundException('perfil no encontrado');
    return ts;
  }
}
