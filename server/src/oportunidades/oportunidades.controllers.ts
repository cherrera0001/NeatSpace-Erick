import {
  Body,
  Controller,
  Get,
  NotFoundException,
  NotImplementedException,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { OportunidadInputDto } from './dto';
import { DbService } from '../db/db.service';
import { currentUserId, DEMO_CLIENTE } from '../common/jwt';

// Contexto Oportunidades + entrada a NeatMatch (doc 07 §1).

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly db: DbService) {}

  /** CU-05 · Publicar oportunidad. IN-5 tipo inmutable; RN-6 geo enmascarada. */
  @Post()
  async create(@Body() dto: OportunidadInputDto, @Req() req: Request): Promise<unknown> {
    const uid = currentUserId(req) ?? DEMO_CLIENTE;
    const geo = JSON.stringify({ lat: dto.lat ?? -33.045, lng: dto.lng ?? -71.62 });
    // La geo va como jsonb; en PostgreSQL real se convierte a geometry(Point,4326).
    const geoExpr =
      this.db.mode === 'pglite'
        ? '$5::jsonb'
        : "ST_SetSRID(ST_MakePoint(($5::jsonb->>'lng')::float,($5::jsonb->>'lat')::float),4326)";
    const { rows } = await this.db.query(
      `INSERT INTO oportunidad (cliente_id, tipo, categoria_id, zona, geo_aprox, precio_ref, descripcion)
       VALUES ($1,$2,$3,$4,${geoExpr},$6,$7)
       RETURNING id, tipo, estado, zona, precio_ref, descripcion, creado_en`,
      [uid, dto.tipo, dto.categoria_id, dto.zona ?? null, geo, dto.precio_ref ?? null, dto.descripcion ?? null],
    );
    return rows[0];
  }

  /** CU-06 · Feed en vivo (geo aproximada, sin dirección exacta). */
  @Get()
  async list(@Query('type') type?: string): Promise<unknown[]> {
    const params: unknown[] = [];
    let where = "o.estado = 'publicado'";
    if (type === 'urgent' || type === 'scheduled') {
      params.push(type);
      where += ` AND o.tipo = $${params.length}`;
    }
    const { rows } = await this.db.query(
      `SELECT o.id, o.tipo, o.estado, o.zona, o.precio_ref, o.descripcion, o.creado_en,
              c.nombre AS categoria
         FROM oportunidad o JOIN categoria c ON c.id = o.categoria_id
        WHERE ${where}
        ORDER BY o.creado_en DESC
        LIMIT 50`,
      params,
    );
    return rows;
  }

  /** CU-06 · Detalle de oportunidad. */
  @Get(':id')
  async get(@Param('id') id: string): Promise<unknown> {
    const { rows } = await this.db.query(
      `SELECT o.id, o.tipo, o.estado, o.zona, o.precio_ref, o.descripcion, o.creado_en,
              c.nombre AS categoria
         FROM oportunidad o JOIN categoria c ON c.id = o.categoria_id
        WHERE o.id = $1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException('oportunidad no encontrada');
    return rows[0];
  }

  /** CU-07 · Postular (programado). */
  @Post(':id/applications')
  apply(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-07 · apply');
  }

  /** CU-08 · Revisar postulaciones (cliente). RN-7 anti-IDOR. */
  @Get(':id/applications')
  listApplications(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-08 · listApplications');
  }

  /** CU-09 · Ranking NeatMatch (RBAC, reason codes). RN-7. */
  @Get(':id/matches')
  getMatches(@Param('id') _id: string, @Query('prefs') _prefs?: string): never {
    throw new NotImplementedException('CU-09 · getMatches');
  }

  /** CU-11 · Abrir la Sala de Acuerdo (crea acuerdo + versión de términos). */
  @Post(':id/agreement')
  async openAgreement(@Param('id') id: string): Promise<unknown> {
    return this.db.tx(async (c) => {
      const opp = await c.query<{ precio_ref: number | null }>(
        'SELECT precio_ref FROM oportunidad WHERE id = $1',
        [id],
      );
      if (!opp.rows.length) throw new NotFoundException('oportunidad no encontrada');
      const precio = opp.rows[0].precio_ref ?? 0;
      const ac = await c.query<{ id: string }>(
        "INSERT INTO acuerdo (oportunidad_id, estado, version_vigente_n) VALUES ($1,'ABIERTA',1) RETURNING id",
        [id],
      );
      const aid = ac.rows[0].id;
      await c.query('INSERT INTO acuerdo_version (acuerdo_id, n, precio) VALUES ($1,1,$2)', [aid, precio]);
      await c.query("UPDATE oportunidad SET estado = 'tomada' WHERE id = $1", [id]);
      return { id: aid, precio, estado: 'ABIERTA' };
    });
  }
}
