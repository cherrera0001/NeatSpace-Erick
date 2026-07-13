# NeatSpace — Definiciones Spec-Driven (SDD)

Este directorio es la **fuente de verdad ejecutable** de NeatSpace. Seguimos **Spec-Driven Development (SDD)**: primero se define el contrato (spec), y el código, los clientes, los mocks, los tests de contrato y la documentación se **derivan** de él. Ningún endpoint, evento o entidad existe si no está aquí antes.

> Coherente con la decisión de arquitectura del Manifiesto y `docs/01-Arquitectura-NeatSpace.md`: **monolito modular, spec-driven (OpenAPI/AsyncAPI)**, con fronteras de módulo listas para cortar.

## Flujo SDD (orden no negociable)

```
docs/ (diseño, el "por qué")  →  specs/ (contrato, el "qué")  →  código (el "cómo")
        ▲                                                              │
        └────────────────── el código NUNCA redefine el contrato ─────┘
```

1. **Diseñar** en `docs/` (ya endurecido por el panel multirol, ver `docs/00-Evaluacion-Multirol.md`).
2. **Especificar** aquí el contrato (síncrono + asíncrono + datos).
3. **Validar** el spec (lint) y acordarlo — es un artefacto revisable en PR.
4. **Generar** tipos, clientes, servidores stub, mocks y tests de contrato desde el spec.
5. **Implementar** contra el contrato; el CI falla si el código diverge del spec.

## Artefactos

| Archivo | Estándar | Cubre | Trazabilidad |
|---|---|---|---|
| `openapi.yaml` | OpenAPI 3.1 | API REST síncrona (auth, oportunidades, NeatMatch, Sala de Acuerdo, NeatWallet, Trust Score, webhooks) | docs 01 §3.3 · 02 · 03 §11 · 04 §9 · 05 §11 |
| `asyncapi.yaml` | AsyncAPI 3.0 | Eventos de dominio publicados entre módulos (event sourcing / colas) | docs 01 §2.2, §3.1 · 03 §10 · 04 · 05 §3 |
| `schemas/entities.yaml` | JSON Schema | Modelo de datos canónico (entidades y proyecciones) | docs 01 §1.3 · 04 §2–3 · 05 §10 |

Cada `path`, `channel` y `schema` lleva una anotación `x-source` que apunta al documento y sección de diseño del que nace. Esa es la traza SDD: **de la filosofía al contrato, sin saltos**.

## Invariantes que el contrato debe preservar (no sólo forma, también reglas)

Estas reglas viven en las descripciones del spec y deben verificarse en tests de contrato:

- **El dinero es partida doble append-only** (doc 04): ninguna escritura de dinero sin `Idempotency-Key`; la comisión (20%) se deriva server-side, jamás llega en el request.
- **El webhook de MercadoPago es la fuente de verdad** (doc 04 §6): `/pay` y `/topup` sólo inician el intento; el asiento se crea al confirmar `approved`.
- **Liberación con confirmación dual** (docs 03 §3, 04 §5): `/release` → 409 si el servicio no está `ENTREGADO`+confirmado (o ventana vencida). Nunca unilateral.
- **Reputación derivada del log** (doc 05): no hay campo `trust_score` seteable; `POST /reviews` → 409 si el servicio no está pagado; el cuerpo nunca trae el 0–100.
- **Geolocalización enmascarada** (doc 01 §3.3, 02, 03 §2): el feed expone sólo geo aproximada; la dirección exacta se revela sólo con Acuerdo aceptado o urgente asignado.
- **Anti-IDOR** (docs 02 §10, 04 §9): cada recurso valida pertenencia; endpoints internos (`/hold`, `/release`, `/refund`, `/internal/*`) no se exponen al cliente.

## Herramientas sugeridas (a fijar al iniciar la implementación)

- Lint de contrato: **Spectral** (OpenAPI + AsyncAPI).
- Generación de tipos/servidor: `openapi-typescript` / `openapi-generator` (alineado con NestJS/TS del doc 01).
- Mock server y tests de contrato: **Prism** / **Dredd**.
- Docs navegables: **Redocly** (REST) y **AsyncAPI Studio** (eventos).

> Estado: **v0.1 (borrador derivado de los docs cerrados)**. Los contratos crecen a medida que cada módulo entra en implementación; toda ampliación entra primero aquí.
