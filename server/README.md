# Stub de servidor NestJS

Esqueleto de servidor **NestJS** derivado del contrato `specs/openapi.yaml` y de los
casos de uso (`docs/06`). Es andamiaje **spec-driven**: la estructura (módulos por
contexto acotado, rutas, reglas) sale del diseño; los handlers están **sin
implementar** (responden `501 Not Implemented`) a la espera de la lógica de dominio.

## Estructura (un módulo por contexto acotado — doc 07 §1)

```
src/
  main.ts                     # bootstrap, prefijo global /v1
  app.module.ts               # importa los 5 módulos
  common/idempotency-key.guard.ts   # RN-1: exige Idempotency-Key en escrituras de dinero
  identidad/                  # auth, categorías, me, profiles
  oportunidades/              # oportunidades + entrada a NeatMatch
  sala-acuerdo/               # agreements + ejecución de servicios
  neatwallet/                 # wallet + endpoints internos de dinero + webhook MP
  reputacion/                 # reviews + trust-score + recompute interno
```

Cada handler lleva en su JSDoc el **CU** y las **reglas (RN/IN)** que debe respetar
(trazabilidad `docs/09`). Los 35 endpoints del contrato están mapeados 1-a-1.

## Correr

```bash
cd server
npm install
npm run build      # tsc -p tsconfig.json  (compila en strict)
npm start          # node dist/main.js  → escucha en :3000 (PORT configurable)
```

## Estado de verificación

- ✅ **Compila** en modo `strict` (`tsc` sin errores).
- ✅ **Arranca**: NestJS registra las **35 rutas** bajo `/v1` sin colisiones
  ("Nest application successfully started").
- ✅ **Comportamiento verificado** por HTTP: los handlers responden `501`; el guard
  de idempotencia responde `400` sin `Idempotency-Key` y deja pasar con ella.

## Próximos pasos (implementación)

1. DTOs con `class-validator` a partir de los schemas del contrato (o de `types/openapi.ts`).
2. Capa de persistencia sobre el esquema de `db/migrations` (TypeORM/Prisma/pg).
3. Implementar cada handler siguiendo su CU; añadir los tests de `docs/10` (unit,
   contrato, integración, seguridad) por endpoint.
4. Guards/estrategias de auth (JWT), verificación HMAC del webhook, RBAC.
