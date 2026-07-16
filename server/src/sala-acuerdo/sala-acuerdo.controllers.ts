import {
  Body,
  Controller,
  Get,
  NotFoundException,
  NotImplementedException,
  Param,
  Post,
} from '@nestjs/common';
import {
  PriceOfferDto,
  AcceptDto,
  AcuerdoVersionDto,
  AmendmentDto,
  MensajeDto,
  DisputaDto,
} from './dto';
import { DbService } from '../db/db.service';
import { commission } from '../domain/money';
import { DEMO_PROFESIONAL } from '../common/jwt';

const LEDGER =
  'INSERT INTO ledger_entry (transaccion_id, wallet_id, direccion, monto, concepto) VALUES ($1,$2,$3,$4,$5)';

// Contexto Sala de Acuerdo + ejecución del servicio (doc 07 §1).

@Controller('agreements')
export class AgreementsController {
  constructor(private readonly db: DbService) {}
  /** CU-11 · Estado, versión vigente, partes, Trust Scores. */
  @Get(':id')
  get(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-11 · getAgreement');
  }

  /** CU-12 · Proponer versión de términos (→ PROPUESTA). */
  @Post(':id/versions')
  proposeVersion(@Param('id') _id: string, @Body() _b: AcuerdoVersionDto): never {
    throw new NotImplementedException('CU-12 · proposeVersion');
  }

  /** CU-13 · Contraoferta con justificación (422 si falta). */
  @Post(':id/price-offers')
  priceOffer(@Param('id') _id: string, @Body() _b: PriceOfferDto): never {
    throw new NotImplementedException('CU-13 · makePriceOffer');
  }

  /** CU-13 · Aceptar una contraoferta. */
  @Post(':id/price-offers/:oid/accept')
  acceptPriceOffer(@Param('id') _id: string, @Param('oid') _oid: string): never {
    throw new NotImplementedException('CU-13 · acceptPriceOffer');
  }

  /** CU-14 · Aceptar → retención de escrow (débito cliente, crédito ESCROW). */
  @Post(':id/accept')
  async accept(@Param('id') id: string, @Body() _b: AcceptDto): Promise<unknown> {
    return this.db.tx(async (c) => {
      const a = await c.query<{ cliente_id: string; precio: number }>(
        `SELECT o.cliente_id, av.precio
           FROM acuerdo ac
           JOIN oportunidad o ON o.id = ac.oportunidad_id
           JOIN acuerdo_version av ON av.acuerdo_id = ac.id AND av.n = ac.version_vigente_n
          WHERE ac.id = $1`,
        [id],
      );
      if (!a.rows.length) throw new NotFoundException('acuerdo no encontrado');
      const { cliente_id, precio } = a.rows[0];
      const clienteW = (
        await c.query<{ id: string }>('SELECT id FROM neatwallet WHERE usuario_id = $1', [cliente_id])
      ).rows[0].id;
      const escrow = (
        await c.query<{ id: string }>("SELECT id FROM neatwallet WHERE rol_sistema = 'escrow'")
      ).rows[0].id;
      const tx = await c.query<{ id: string }>(
        "INSERT INTO transaccion (tipo, idempotency_key) VALUES ('retencion',$1) RETURNING id",
        ['ret-' + id],
      );
      const txId = tx.rows[0].id;
      await c.query(LEDGER, [txId, clienteW, 'debito', precio, 'Retención en escrow']);
      await c.query(LEDGER, [txId, escrow, 'credito', precio, 'Retención en escrow']);
      await c.query(
        "UPDATE acuerdo SET estado='ACORDADO', aceptado_cliente=true, aceptado_profesional=true WHERE id=$1",
        [id],
      );
      return { estado: 'ACORDADO', retenido: precio };
    });
  }

  /** CU-15 · Enmienda durante EN_EJECUCION. */
  @Post(':id/amendments')
  amend(@Param('id') _id: string, @Body() _b: AmendmentDto): never {
    throw new NotImplementedException('CU-15 · amend');
  }

  /** CU-16 · Marcar trabajo entregado (→ ENTREGADO). */
  @Post(':id/deliver')
  deliver(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-16 · deliver');
  }

  /** CU-17 · Confirmar entrega → CERRADO + liberación (ESCROW → profesional neto + COMISION 20%). */
  @Post(':id/confirm')
  async confirm(@Param('id') id: string): Promise<unknown> {
    return this.db.tx(async (c) => {
      const a = await c.query<{ precio: number }>(
        `SELECT av.precio FROM acuerdo ac
           JOIN acuerdo_version av ON av.acuerdo_id = ac.id AND av.n = ac.version_vigente_n
          WHERE ac.id = $1`,
        [id],
      );
      if (!a.rows.length) throw new NotFoundException('acuerdo no encontrado');
      const precio = Number(a.rows[0].precio);
      const com = commission(precio); // round(precio × 0.20), server-side
      const neto = precio - com; // complemento exacto (IN-2)
      const w = async (rol: string) =>
        (await c.query<{ id: string }>("SELECT id FROM neatwallet WHERE rol_sistema = $1", [rol])).rows[0].id;
      const escrow = await w('escrow');
      const comW = await w('comision');
      const profW = (
        await c.query<{ id: string }>('SELECT id FROM neatwallet WHERE usuario_id = $1', [DEMO_PROFESIONAL])
      ).rows[0].id;
      const tx = await c.query<{ id: string }>(
        "INSERT INTO transaccion (tipo, idempotency_key) VALUES ('liberacion',$1) RETURNING id",
        ['rel-' + id],
      );
      const txId = tx.rows[0].id;
      await c.query(LEDGER, [txId, escrow, 'debito', precio, 'Liberación de escrow']);
      await c.query(LEDGER, [txId, profW, 'credito', neto, 'Pago al profesional']);
      await c.query(LEDGER, [txId, comW, 'credito', com, 'Comisión NeatSpace 20%']);
      await c.query("UPDATE acuerdo SET estado='CERRADO' WHERE id=$1", [id]);
      return { estado: 'CERRADO', neto_profesional: neto, comision: com };
    });
  }

  /** CU-18 · Cancelar según política de estado. */
  @Post(':id/cancel')
  cancel(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-18 · cancelAgreement');
  }

  /** CU-19 · Mensajes de la sala. */
  @Get(':id/messages')
  listMessages(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-19 · listMessages');
  }

  /** CU-19 · Enviar mensaje (NeatAI puede advertir contacto externo, RN-10). */
  @Post(':id/messages')
  sendMessage(@Param('id') _id: string, @Body() _b: MensajeDto): never {
    throw new NotImplementedException('CU-19 · sendMessage');
  }
}

@Controller('services')
export class ServicesExecutionController {
  /** CU-20 · Iniciar ejecución. */
  @Post(':id/start')
  start(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-20 · startService');
  }

  /** CU-20 · Finalizar ejecución (abre ventana de disputa). */
  @Post(':id/finish')
  finish(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-20 · finishService');
  }

  /** CU-32 · Abrir disputa (congela escrow → EN_DISPUTA). */
  @Post(':id/disputes')
  openDispute(@Param('id') _id: string, @Body() _b: DisputaDto): never {
    throw new NotImplementedException('CU-32 · openDispute');
  }
}
