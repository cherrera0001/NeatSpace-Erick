import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from './app.module';
import { configureApp } from './app.config';

// Token de la contraparte profesional demo (para probar el double-blind bidireccional).
const DEMO_PROFESIONAL = 'b0000000-0000-4000-8000-000000000002';
const proBearer = () =>
  `Bearer ${jwt.sign({ sub: DEMO_PROFESIONAL }, process.env.JWT_SECRET ?? 'dev-only-insecure-secret')}`;

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

  it('email case-insensitive: registrar con mayúsculas y loguear en minúsculas (mismo dueño)', async () => {
    const base = `case-${Date.now()}`;
    await http()
      .post('/v1/auth/register')
      .send({ nombre: 'Case', email: `${base}@Demo.CL`.toUpperCase(), password: 'secreto8' })
      .expect(201);
    // Login con otra caja → misma cuenta (citext en prod, normalizado en la app).
    await http().post('/v1/auth/login').send({ email: `${base}@demo.cl`, password: 'secreto8' }).expect(200);
    // Re-registro con distinta caja → 409 (no crea cuenta duplicada).
    await http()
      .post('/v1/auth/register')
      .send({ nombre: 'Dup', email: `${base}@demo.cl`, password: 'secreto8' })
      .expect(409);
  });

  it('cuerpo de error cumple el contrato: code (string) + message (string)', async () => {
    const r = await http().post('/v1/auth/login').send({ email: 'nadie@demo.cl', password: 'malo' }).expect(401);
    expect(typeof r.body.code).toBe('string'); // discriminador del contrato Error
    expect(r.body.code).toBe('UNAUTHORIZED');
    expect(typeof r.body.message).toBe('string');
    // 422 de validación: message es string (no array) y el detalle va en details.errors
    const v = await http().post('/v1/auth/register').send({ email: 'no-email', password: '1' }).expect(422);
    expect(v.body.code).toBe('UNPROCESSABLE_ENTITY');
    expect(typeof v.body.message).toBe('string');
    expect(Array.isArray(v.body.details?.errors)).toBe(true);
  });

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

  it('accept sobre acuerdo sin precio (precio_ref omitido → 0) → 409, no 500', async () => {
    // Publicar sin precio_ref: openAgreement fija precio 0; retener 0 violaría CHECK(monto>0).
    const pub = await http()
      .post('/v1/opportunities')
      .send({ tipo: 'urgent', categoria_id: 'a0000000-0000-4000-8000-000000000003' })
      .expect(201);
    const ag = await http().post(`/v1/opportunities/${pub.body.id}/agreement`).expect(201);
    await http()
      .post(`/v1/agreements/${ag.body.id}/accept`)
      .send({ version_n: 1, step_up: { metodo: 'pin', token: 't' } })
      .expect(409);
  });

  it('confirm con precio ínfimo (comisión redondea a 0) → 201 sin asiento de monto 0', async () => {
    await http()
      .post('/v1/wallet/topup')
      .set('Idempotency-Key', 'e2e-tiny')
      .send({ monto: 10 })
      .expect(201);
    const pub = await http()
      .post('/v1/opportunities')
      .send({ tipo: 'urgent', categoria_id: 'a0000000-0000-4000-8000-000000000003', precio_ref: 2 })
      .expect(201);
    const ag = await http().post(`/v1/opportunities/${pub.body.id}/agreement`).expect(201);
    await http()
      .post(`/v1/agreements/${ag.body.id}/accept`)
      .send({ version_n: 1, step_up: { metodo: 'pin', token: 't' } })
      .expect(201);
    const rel = await http().post(`/v1/agreements/${ag.body.id}/confirm`).expect(201);
    expect(rel.body.comision).toBe(0); // round(2 × 0.20) = 0 → pata omitida
    expect(rel.body.neto_profesional).toBe(2);
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

  it('GET /opportunities/:id con uuid inválido → 400, no 500', () =>
    http().get('/v1/opportunities/abc').expect(400));

  it('POST /agreements/:id/confirm con uuid inválido → 400, no 500', () =>
    http().post('/v1/agreements/not-a-uuid/confirm').expect(400));

  it('topup idempotente: misma Idempotency-Key no acredita dos veces', async () => {
    const before = (await http().get('/v1/wallet').expect(200)).body.saldo as number;
    await http().post('/v1/wallet/topup').set('Idempotency-Key', 'e2e-idem-dup').send({ monto: 1000 }).expect(201);
    await http().post('/v1/wallet/topup').set('Idempotency-Key', 'e2e-idem-dup').send({ monto: 1000 }).expect(201);
    const after = (await http().get('/v1/wallet').expect(200)).body.saldo as number;
    expect(after - before).toBe(1000); // un solo abono pese a dos llamadas
  });

  it('topup con Idempotency-Key tipo "rel-<id>" NO bloquea el escrow (namespace aislado)', async () => {
    // Reserva una clave que colisionaría con la de liberación si no hubiese namespace.
    await http().post('/v1/wallet/topup').set('Idempotency-Key', 'rel-colision-test').send({ monto: 500 }).expect(201);
    // El flujo de escrow completo debe seguir funcionando pese a esa clave "maliciosa".
    await http().post('/v1/wallet/topup').set('Idempotency-Key', 'e2e-ns-topup').send({ monto: 30000 }).expect(201);
    const pub = await http()
      .post('/v1/opportunities')
      .send({ tipo: 'scheduled', categoria_id: 'a0000000-0000-4000-8000-000000000002', precio_ref: 15000 })
      .expect(201);
    const ag = await http().post(`/v1/opportunities/${pub.body.id}/agreement`).expect(201);
    await http()
      .post(`/v1/agreements/${ag.body.id}/accept`)
      .send({ version_n: 1, step_up: { metodo: 'pin', token: 't' } })
      .expect(201);
    await http().post(`/v1/agreements/${ag.body.id}/confirm`).expect(201);
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

  // ── Reputación / Trust Score (CU-29/30/31) ──

  it('trust-score de perfil sin evaluaciones → 200 cold-start (prior 75)', async () => {
    const reg = await http()
      .post('/v1/auth/register')
      .send({ nombre: 'ColdStart', email: `cold-${Date.now()}@demo.cl`, password: 'secreto8' })
      .expect(201);
    const r = await http().get(`/v1/profiles/${reg.body.usuario.id}/trust-score`).expect(200);
    expect(r.body.valor_0_100).toBe(75);
    expect(r.body.n_evaluaciones).toBe(0);
  });

  it('trust-score de perfil inexistente → 404', () =>
    http().get('/v1/profiles/00000000-0000-4000-8000-000000000000/trust-score').expect(404));

  it('review sobre servicio no CERRADO → 409', async () => {
    // Publica su propia oportunidad para no consumir las sembradas que otros tests usan.
    const pub = await http()
      .post('/v1/opportunities')
      .send({ tipo: 'urgent', categoria_id: 'a0000000-0000-4000-8000-000000000003', precio_ref: 9000 })
      .expect(201);
    const ag = await http().post(`/v1/opportunities/${pub.body.id}/agreement`).expect(201);
    await http().post(`/v1/services/${ag.body.id}/reviews`).send({ estrellas: 5 }).expect(409);
  });

  // Cierra un servicio (acuerdo CERRADO) del cliente demo y devuelve su id.
  const cerrarServicio = async (precio: number, key: string) => {
    await http().post('/v1/wallet/topup').set('Idempotency-Key', key).send({ monto: precio + 5000 }).expect(201);
    const pub = await http()
      .post('/v1/opportunities')
      .send({ tipo: 'scheduled', categoria_id: 'a0000000-0000-4000-8000-000000000002', precio_ref: precio })
      .expect(201);
    const ag = await http().post(`/v1/opportunities/${pub.body.id}/agreement`).expect(201);
    await http()
      .post(`/v1/agreements/${ag.body.id}/accept`)
      .send({ version_n: 1, step_up: { metodo: 'pin', token: 't' } })
      .expect(201);
    await http().post(`/v1/agreements/${ag.body.id}/confirm`).expect(201);
    return ag.body.id as string;
  };

  it('double-blind: 1ª evaluación queda oculta (published:false, sin cambiar Trust Score)', async () => {
    const svc = await cerrarServicio(12000, 'e2e-rep-hidden');
    const rev = await http()
      .post(`/v1/services/${svc}/reviews`)
      .send({ estrellas: 5, atributos: { amable: true } })
      .expect(201);
    expect(rev.body.published).toBe(false);
    expect(rev.body.trust_score).toBeNull(); // no se filtra puntaje antes de publicar
  });

  it('double-blind: al evaluar ambas partes se publica y el Trust Score se recomputa', async () => {
    const svc = await cerrarServicio(12000, 'e2e-rep-both');
    // Cliente demo evalúa al profesional (oculto).
    const r1 = await http().post(`/v1/services/${svc}/reviews`).send({ estrellas: 5 }).expect(201);
    expect(r1.body.published).toBe(false);
    // El profesional evalúa al cliente → publicación simultánea.
    const r2 = await http()
      .post(`/v1/services/${svc}/reviews`)
      .set('Authorization', proBearer())
      .send({ estrellas: 4 })
      .expect(201);
    expect(r2.body.published).toBe(true);
    expect(r2.body.rol_evaluado).toBe('cliente');
    expect(typeof r2.body.trust_score).toBe('number');
    // Reevaluar (misma parte, mismo servicio) → 409 (IN-4).
    await http().post(`/v1/services/${svc}/reviews`).send({ estrellas: 3 }).expect(409);
  });

  it('review por un tercero ajeno al servicio → 403 (RN-7, no manipula reputación)', async () => {
    const svc = await cerrarServicio(9000, 'e2e-rep-3rd');
    const reg = await http()
      .post('/v1/auth/register')
      .send({ nombre: 'Ajeno', email: `ajeno-${Date.now()}@demo.cl`, password: 'secreto8' })
      .expect(201);
    await http()
      .post(`/v1/services/${svc}/reviews`)
      .set('Authorization', `Bearer ${reg.body.token as string}`)
      .send({ estrellas: 1 })
      .expect(403);
  });

  it('publicar con categoria_id uuid válido pero inexistente → 422 (FK), no 500', () =>
    http()
      .post('/v1/opportunities')
      .send({ tipo: 'urgent', categoria_id: '00000000-0000-4000-8000-0000000000ff', precio_ref: 5000 })
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
