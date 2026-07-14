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

  it('register válido → 501 (pasa validación, llega al stub)', () =>
    http()
      .post('/v1/auth/register')
      .send({ email: 'ana@ejemplo.cl', password: 'secreto8', nombre: 'Ana' })
      .expect(501));

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
});
