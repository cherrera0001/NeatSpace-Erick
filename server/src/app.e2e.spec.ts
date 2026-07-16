import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { configureApp } from './app.config';

// e2e sin BD: la validación corre en el ValidationPipe / guards ANTES de tocar la
// BD. Verifica el contrato de entrada: cuerpo inválido → 422; guard de idempotencia
// (RN-1) → 400; validaciones de negocio previas a la query → 400.

describe('Validación de contrato (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('register inválido (email/pass) → 422', () =>
    http().post('/v1/auth/register').send({ email: 'no-email', password: '123' }).expect(422));

  it('register con carácter de control (NUL) en nombre → 400, no 500', () =>
    http()
      .post('/v1/auth/register')
      .send({ email: 'x@demo.cl', password: 'secreto8', nombre: 'a' + String.fromCharCode(0) + 'b' })
      .expect(400));

  // El happy-path de register/login es DB-backed → se verifica en CI (job `stack`,
  // docker compose con Postgres real), no en este e2e sin BD.

  it('topup sin Idempotency-Key → 400 (guard antes del pipe, RN-1)', () =>
    http().post('/v1/wallet/topup').send({ monto: 1000 }).expect(400));

  it('topup con key + monto inválido (0) → 422', () =>
    http().post('/v1/wallet/topup').set('Idempotency-Key', 'k1').send({ monto: 0 }).expect(422));

  it('topup con key + válido → 201 (asiento de partida doble real)', () =>
    http().post('/v1/wallet/topup').set('Idempotency-Key', 'e2e-topup-1').send({ monto: 1000 }).expect(201));

  it('review con estrellas fuera de rango → 422', () =>
    http().post('/v1/services/abc/reviews').send({ estrellas: 9 }).expect(422));

  it('price-offer sin justificacion → 422', () =>
    http().post('/v1/agreements/abc/price-offers').send({ monto: 1000 }).expect(422));

  it('accept sin version_n/step_up → 422', () =>
    http().post('/v1/agreements/abc/accept').send({}).expect(422));

  it('accept sobre acuerdo inexistente → 404', () =>
    http()
      .post('/v1/agreements/00000000-0000-4000-8000-000000000000/accept')
      .send({ version_n: 1, step_up: { metodo: 'pin', token: 't' } })
      .expect(404));

  it('interno hold sin X-Internal-Token → 403 (ServiceAuthGuard corre primero)', () =>
    http().post('/v1/services/abc/hold').set('Idempotency-Key', 'k1').expect(403));

  it('interno hold con token de servicio pero sin Idempotency-Key → 400', () =>
    http().post('/v1/services/abc/hold').set('X-Internal-Token', 'svc').expect(400));

  // Validación de query params de /categories (ocurre ANTES de tocar la BD → sin BD)
  it('categories?parent=no-uuid → 400', () =>
    http().get('/v1/categories?parent=abc').expect(400));

  it('categories?level=2.5 → 400', () =>
    http().get('/v1/categories?level=2.5').expect(400));

  it('categories?level=9999999999 (fuera de rango int4) → 400, no 500', () =>
    http().get('/v1/categories?level=9999999999').expect(400));

  // ── Flujos reales contra la BD embebida (PGlite) ──
  it('registro real → 201 con token y NeatProfile', async () => {
    const r = await http()
      .post('/v1/auth/register')
      .send({ nombre: 'E2E', email: `e2e-${Date.now()}@demo.cl`, password: 'secreto8' })
      .expect(201);
    expect(typeof r.body.token).toBe('string');
    expect(r.body.usuario.nombre).toBe('E2E');
    expect(r.body.usuario.usuario_id).toBeTruthy();
  });

  it('login credenciales inválidas → 401', () =>
    http().post('/v1/auth/login').send({ email: 'nadie@demo.cl', password: 'malo' }).expect(401));

  it('feed de oportunidades → 200 con datos sembrados', async () => {
    const r = await http().get('/v1/opportunities').expect(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.length).toBeGreaterThan(0);
  });

  it('publicar oportunidad → 201', () =>
    http()
      .post('/v1/opportunities')
      .send({
        tipo: 'urgent',
        categoria_id: 'a0000000-0000-4000-8000-000000000003',
        zona: 'Test',
        precio_ref: 9000,
      })
      .expect(201));

  it('wallet del cliente demo → saldo numérico', async () => {
    const r = await http().get('/v1/wallet').expect(200);
    expect(typeof r.body.saldo).toBe('number');
  });

  // ── Guardias contables/entrada (hallazgos r7, verificados adversarialmente) ──

  it('confirm sin retención previa (acuerdo ABIERTA) → 409, no acuña dinero', async () => {
    const feed = await http().get('/v1/opportunities').expect(200);
    const opp = (feed.body as Array<{ id: string; estado: string }>).find(
      (o) => o.estado === 'publicado',
    )!;
    const ag = await http().post(`/v1/opportunities/${opp.id}/agreement`).expect(201);
    // Sin accept() (sin retención): confirm debe rechazarse, no liberar escrow.
    await http().post(`/v1/agreements/${ag.body.id}/confirm`).expect(409);
  });

  it('accept sin fondos suficientes → 409 (no deja saldo negativo)', async () => {
    // Usuario recién registrado: su NeatWallet arranca en 0. Publica y abre acuerdo.
    const reg = await http()
      .post('/v1/auth/register')
      .send({ nombre: 'SinFondos', email: `nofunds-${Date.now()}@demo.cl`, password: 'secreto8' })
      .expect(201);
    const bearer = `Bearer ${reg.body.token as string}`;
    const pub = await http()
      .post('/v1/opportunities')
      .set('Authorization', bearer)
      .send({ tipo: 'scheduled', categoria_id: 'a0000000-0000-4000-8000-000000000002', precio_ref: 50000 })
      .expect(201);
    const ag = await http().post(`/v1/opportunities/${pub.body.id}/agreement`).expect(201);
    await http()
      .post(`/v1/agreements/${ag.body.id}/accept`)
      .send({ version_n: 1, step_up: { metodo: 'pin', token: 't' } })
      .expect(409);
  });

  it('accept con version_n obsoleta → 409 (concurrencia optimista)', async () => {
    const feed = await http().get('/v1/opportunities').expect(200);
    const opp = (feed.body as Array<{ id: string; estado: string }>).find(
      (o) => o.estado === 'publicado',
    )!;
    const ag = await http().post(`/v1/opportunities/${opp.id}/agreement`).expect(201);
    await http()
      .post(`/v1/agreements/${ag.body.id}/accept`)
      .send({ version_n: 99, step_up: { metodo: 'pin', token: 't' } })
      .expect(409);
  });

  it('publicar con NUL (0x00) en descripcion → 400, no 500', () =>
    http()
      .post('/v1/opportunities')
      .send({
        tipo: 'urgent',
        categoria_id: 'a0000000-0000-4000-8000-000000000003',
        descripcion: 'x' + String.fromCharCode(0) + 'y',
      })
      .expect(400));

  it('topup con monto fuera de rango (1e30) → 422, no desborda BIGINT (500)', () =>
    http()
      .post('/v1/wallet/topup')
      .set('Idempotency-Key', 'e2e-overflow')
      .send({ monto: 1e30 })
      .expect(422));

  it('flujo de escrow: acuerdo → retención → liberación (comisión 20% exacta)', async () => {
    await http()
      .post('/v1/wallet/topup')
      .set('Idempotency-Key', 'e2e-escrow-topup')
      .send({ monto: 30000 })
      .expect(201);
    const feed = await http().get('/v1/opportunities').expect(200);
    const opp = (feed.body as Array<{ id: string; precio_ref: number }>).find(
      (o) => o.precio_ref === 28000,
    )!;
    const ag = await http().post(`/v1/opportunities/${opp.id}/agreement`).expect(201);
    await http()
      .post(`/v1/agreements/${ag.body.id}/accept`)
      .send({ version_n: 1, step_up: { metodo: 'pin', token: 't' } })
      .expect(201);
    const rel = await http().post(`/v1/agreements/${ag.body.id}/confirm`).expect(201);
    expect(rel.body.comision).toBe(5600); // 28.000 × 20%
    expect(rel.body.neto_profesional).toBe(22400);
  });
});
