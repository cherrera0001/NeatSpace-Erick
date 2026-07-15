import { describe, it, beforeAll, afterAll } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { configureApp } from './app.config';

// e2e sin BD: la validación corre en el ValidationPipe ANTES del handler (que es
// un stub 501). Verifica el contrato de entrada: cuerpo inválido → 422; el guard
// de idempotencia (RN-1) corre antes del pipe → 400.

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

  // El happy-path de register/login es DB-backed → se verifica en CI (job `stack`,
  // docker compose con Postgres real), no en este e2e sin BD.

  it('topup sin Idempotency-Key → 400 (guard antes del pipe, RN-1)', () =>
    http().post('/v1/wallet/topup').send({ monto: 1000 }).expect(400));

  it('topup con key + monto inválido (0) → 422', () =>
    http().post('/v1/wallet/topup').set('Idempotency-Key', 'k1').send({ monto: 0 }).expect(422));

  it('topup con key + válido → 501 (stub)', () =>
    http().post('/v1/wallet/topup').set('Idempotency-Key', 'k1').send({ monto: 1000 }).expect(501));

  it('review con estrellas fuera de rango → 422', () =>
    http().post('/v1/services/abc/reviews').send({ estrellas: 9 }).expect(422));

  it('price-offer sin justificacion → 422', () =>
    http().post('/v1/agreements/abc/price-offers').send({ monto: 1000 }).expect(422));

  it('accept sin version_n/step_up → 422', () =>
    http().post('/v1/agreements/abc/accept').send({}).expect(422));

  it('accept válido → 501', () =>
    http()
      .post('/v1/agreements/abc/accept')
      .send({ version_n: 1, step_up: { metodo: 'pin', token: 't' } })
      .expect(501));

  it('interno hold sin X-Internal-Token → 403 (ServiceAuthGuard corre primero)', () =>
    http().post('/v1/services/abc/hold').set('Idempotency-Key', 'k1').expect(403));

  it('interno hold con token de servicio pero sin Idempotency-Key → 400', () =>
    http().post('/v1/services/abc/hold').set('X-Internal-Token', 'svc').expect(400));

  // Validación de query params de /categories (ocurre ANTES de tocar la BD → sin BD)
  it('categories?parent=no-uuid → 400', () =>
    http().get('/v1/categories?parent=abc').expect(400));

  it('categories?level=2.5 → 400', () =>
    http().get('/v1/categories?level=2.5').expect(400));
});
