# Estrategia de QA y Casos de Prueba — NeatSpace
### Tomo Técnico X · Calidad verificable desde el diseño

**Base:** `docs/06-Casos-de-Uso.md` (CU + RN), `docs/07-MER.md` (IN), `docs/08-MR.md` (constraints/triggers), `docs/09-Trazabilidad.md` y los contratos `specs/`. Filosofía: **cada caso de uso, regla de negocio e invariante de datos se convierte en al menos un test.** El QA no se agrega al final — se **deriva del contrato** (SDD) y corre como *gate* en CI desde el día uno (Art. IV, Cap. 44; doc 01 §3.2 accesibilidad como NFR de primera clase).

> Alcance stack (doc 01): **NestJS/TypeScript**, **PostgreSQL 15 + PostGIS**, **Redis**, **MercadoPago**. Las herramientas citadas son sugerencias a fijar al iniciar la implementación.

---

## 1. Pirámide de pruebas y objetivos de cobertura

```
        ╱╲          E2E / funcionales (pocas, críticas)      ~10%  → flujos de CU completos
       ╱──╲         Integración + contrato (medias)          ~30%  → API↔DB↔eventos, OpenAPI/AsyncAPI
      ╱────╲        Unitarias (muchas, rápidas)              ~60%  → dominio puro, sin I/O
     ╱──────╲
   Transversal (corre en todos los niveles): Seguridad · Performance · Estrés · Resiliencia
```

| Nivel | Qué prueba | Herramientas sugeridas | Gate CI |
|---|---|---|---|
| **Unitario** | Lógica de dominio pura (comisión, bayesiano, hash, máquina de estados) | Vitest/Jest | cobertura líneas ≥ 80%, dominio de dinero/reputación **≥ 95%** |
| **Contrato** | Conformidad con `openapi.yaml`/`asyncapi.yaml` | Spectral (lint), Schemathesis, Prism (mock), Dredd | 0 findings de lint; property-based verde |
| **Integración** | API ↔ PostgreSQL/PostGIS ↔ Redis ↔ eventos; constraints y triggers | Supertest + **Testcontainers** (PG+PostGIS real) | verde obligatorio |
| **E2E / funcional** | Flujos de CU completos (happy + alternos + excepción) | Testcontainers / entorno efímero; Playwright para UI | los CU críticos en verde |
| **Seguridad** | IDOR, authz, HMAC, replay, idempotencia, inyección, geo-masking | OWASP ZAP, tests dirigidos | sin hallazgos altos/críticos |
| **Performance / Estrés** | Latencia, throughput, concurrencia, picos, resistencia | **k6** / Artillery; `EXPLAIN ANALYZE` | dentro de SLOs (§7) |

---

## 2. Unitarias — dominio puro (las más numerosas y rápidas)

| ID | Caso | Traza | Criterio de aceptación |
|---|---|---|---|
| TC-U01 | `comision = round(total × 0.20)` | RN-2 | 10.000→2.000; 15.000→3.000; 999→200 (redondeo). |
| TC-U02 | `neto = total − comision` (complemento exacto, no `round(total×0.8)`) | RN-2, IN-2 | Σ(neto+comision)=total; nunca descuadra en $1. |
| TC-U03 | Comisión proporcional en resolución dividida | doc 04 §5.5 | prof recibe 6.000 → comisión 1.200, reembolso 4.000 sin comisión. |
| TC-U04 | **Sin comisión sobre reembolso** | RN-2 | refund total: COMISION no participa. |
| TC-U05 | Media bayesiana: 1 reseña de 5★ **no** da 100/100 | doc 05 §4.1 | score < 100 con n=1; tiende al valor real con volumen. |
| TC-U06 | Cold-start: n=0 → badge, no número engañoso | doc 05 §5 | expone badge "Nuevo", score≈prior. |
| TC-U07 | Peso `ω_evaluador` **acotado por techo** | doc 05 §4.3 | cuenta de score alto no supera el tope; sin bucle. |
| TC-U08 | Hash de cadena: `hash_actual = H(hash_prev ‖ payload)` | IN-8 | recomputo reproduce la cadena. |
| TC-U09 | Máquina de estados del Acuerdo: transiciones válidas/ inválidas | doc 07 §4 | ACORDADO→EN_EJECUCION ok; ACORDADO→ENTREGADO y PROPUESTA→CERRADO rechazados. |
| TC-U10 | XOR de identidad de billetera (CHECK explícito booleano) | IN-1 | (u,·,·) ok; (u,e,·) rechazado; (·,·,·) rechazado. |
| TC-U11 | Enmienda que sube/baja precio ajusta retención | doc 04 §10 | sube→retención extra; baja→devolución. |
| TC-U12 | Decay: sanción grave de seguridad **no** expira como rating | doc 05 §6 | ω_recencia no elimina sanción de riesgo. |

---

## 3. Contrato e integración (API ↔ datos ↔ eventos)

| ID | Caso | Traza | Criterio |
|---|---|---|---|
| TC-C01 | Lint de `openapi.yaml`/`asyncapi.yaml` | specs | Spectral: 0 errores. |
| TC-C02 | Respuestas conformes al schema (fuzzing de contrato) | specs | Schemathesis: sin violaciones de schema/estado. |
| TC-I01 | `CHECK` XOR de billetera rechaza doble identidad | IN-1 | INSERT con usuario_id+empresa_id → error. |
| TC-I02 | **Balance de partida doble** (trigger diferido) | IN-2 | transacción con Σdébitos≠Σcréditos → rollback al commit. |
| TC-I03 | **Append-only**: UPDATE/DELETE en `ledger_entry`, `reputation_log`, `acuerdo_version` → error | IN-3 | trigger `prevent_mutation` dispara. |
| TC-I04 | `UNIQUE(servicio, evaluador)` en `evaluacion` | IN-4 | segunda reseña del mismo evaluador → error. |
| TC-I05 | `oportunidad.tipo` inmutable | IN-5 | UPDATE de tipo → error. |
| TC-I06 | `idempotency_key` único en `transaccion` | RN-1 | reintento con misma clave no crea 2ª transacción. |
| TC-I07 | Feed usa índice GiST (plan) | doc 08 §9 | `EXPLAIN` muestra Index Scan geográfico, no Seq Scan. |
| TC-I08 | Proyección `trust_score` == recompute desde `reputation_log` | IN-7 | job de verificación: 0 descuadre. |
| TC-I09 | Publicación de eventos de dominio al cambiar estado | asyncapi | `AcuerdoAceptado`/`EscrowLiberado` emitidos con payload válido. |

---

## 4. Funcionales / E2E (flujos de CU, con alternos y excepciones)

| ID | Escenario | Traza | Criterio |
|---|---|---|---|
| TC-F01 | Happy path completo: publicar→match→acordar→pagar→ejecutar→entregar→confirmar→liberar→evaluar | CU-05→29 | dinero y reputación consistentes de punta a punta. |
| TC-F02 | Aceptación con retención fallida → `PAGO_FALLIDO` → reintento | CU-14 | no queda `ACORDADO`; emite `RetencionEscrowFallida`. |
| TC-F03 | Cliente no confirma → **auto-liberación** al vencer ventana | CU-17 | Scheduler libera; `EscrowLiberado`. |
| TC-F04 | Disputa a favor del cliente → reembolso total sin comisión | CU-32/33 | ledger balanceado; COMISION no participa. |
| TC-F05 | Resolución dividida | CU-33 | asientos de prof + comisión proporcional + reembolso. |
| TC-F06 | Evaluación **double-blind**: oculta hasta que ambos envían | CU-29 | no visible antes; publicación simultánea. |
| TC-F07 | Solo una parte evalúa → publica al vencer, sin penalizar | CU-29 | la ausente no baja score de la otra. |
| TC-F08 | Reseña sin pago → **409** | RN-5 | `POST /reviews` rechazado. |
| TC-F09 | Enmienda no re-aceptada → continúa términos previos / cancela sin penalidad | doc 03 §12 | escrow coherente con el desenlace. |
| TC-F10 | Fallback SinCobertura crea programada enlazada | CU-10 alt | `convertida_desde_id` seteado; urgente cerrada. |

---

## 5. Seguridad (transversal — riesgo alto)

| ID | Caso | Traza | Criterio |
|---|---|---|---|
| TC-S01 | **IDOR**: usuario A no accede a billetera/transacción de B | RN-7 | `GET /wallet/transactions/{id}` ajeno → 403/404. |
| TC-S02 | Endpoints internos (`/hold`, `/release`, `/refund`, `/internal/*`) no expuestos al cliente | RN-7 | 403 sin auth servicio-a-servicio. |
| TC-S03 | Webhook con **firma HMAC inválida** → 401, sin asiento | doc 04 §6.2 | rechazo; nada se asienta. |
| TC-S04 | Webhook **replay** (event-id repetido) → dedup | CU-26, IN-3 | un solo asiento; `mercadopago_event` UQ. |
| TC-S05 | Escritura de dinero **sin** `Idempotency-Key` → 400 | RN-1 | rechazo antes de asentar. |
| TC-S06 | Comisión enviada en el request es **ignorada** | RN-2 | se deriva server-side; el valor del cliente no altera nada. |
| TC-S07 | **Geo-masking**: feed no expone `direccion_texto`; se revela solo tras acuerdo aceptado/urgente | RN-6 | dirección exacta ausente en `GET /opportunities`. |
| TC-S08 | RBAC de `/matches`: no expone Trust Score crudo EMERGING a no-clientes | doc 02 §10 | 403 / dato degradado. |
| TC-S09 | Inyección SQL/NoSQL en parámetros de búsqueda | Art. IV | queries parametrizadas; sin fuga. |
| TC-S10 | No repudio: `acuerdo_aceptacion` registra método de verificación | doc 03 §4.1 | step-up obligatorio sobre umbral. |
| TC-S11 | Alteración de `reputation_log` rompe la cadena y se detecta | IN-8 | auditoría marca discontinuidad de hash. |
| TC-S12 | Maker-checker: misma persona no puede aprobar su propia acción | RN-9 | `checker_id ≠ maker_id` (CHECK). |
| TC-S13 | **Derecho de datos (Ley 21.719):** *tombstone* de PII/comentario sin romper la cadena de hash | doc 05 §3, IN-8 | texto redactado; `hash_actual` intacto; señal numérica preservada. |

---

## 6. Concurrencia y correctitud bajo carga

| ID | Caso | Traza | Criterio |
|---|---|---|---|
| TC-X01 | **Asignación atómica urgente**: N profesionales aceptan a la vez | CU-10 | **exactamente uno** gana; el resto recibe 409; una sola `aceptacion_urgente`. |
| TC-X02 | Doble clic en "retirar" concurrente | doc 04 §10 | `Idempotency-Key` evita doble payout. |
| TC-X03 | Aceptación de versión desactualizada en carrera de ediciones | CU-14 alt | 409; sin retención sobre términos viejos. |
| TC-X04 | Retención concurrente con saldo parcial | doc 04 §10 | vías (a)+(b) en una sola transacción balanceada. |
| TC-X05 | Ledger bajo escritura concurrente mantiene invariante Σ=0 | IN-2 | ninguna transacción queda desbalanceada. |

---

## 7. Performance, estrés y resistencia (no funcionales)

### 7.1 SLOs objetivo (a ratificar con Erick / datos reales)

| Escenario | Métrica | Objetivo inicial |
|---|---|---|
| Feed de oportunidades (`GET /opportunities`, GiST) | p95 latencia | < 200 ms @ 500 rps |
| Ranking NeatMatch (`GET /.../matches`) | p95 | < 400 ms |
| Lectura de billetera (`GET /wallet`) | p95 | < 250 ms |
| Escritura de dinero (topup/hold/release) | p95 | < 500 ms |
| Ingesta de webhook MercadoPago | throughput | ≥ 200 eventos/s sin pérdida |
| Disponibilidad servicios críticos | uptime | objetivo alto, con degradación elegante (doc 01 §Cap.15) |

### 7.2 Tipos de prueba de carga (k6/Artillery)

| ID | Tipo | Descripción | Criterio |
|---|---|---|---|
| TC-P01 | **Carga (load)** | Tráfico esperado sostenido sobre feed + match + wallet | SLOs §7.1 cumplidos; error rate < 0.1%. |
| TC-P02 | **Estrés (stress)** | Subir carga hasta el punto de quiebre | identificar *breakpoint*; degradación controlada, sin corrupción de datos. |
| TC-P03 | **Pico (spike)** | Ráfaga súbita (p. ej. campaña, hora punta urgente) | recupera latencia < X s tras el pico; sin 5xx en cascada. |
| TC-P04 | **Resistencia (soak)** | Carga media sostenida 8–24 h | sin fugas de memoria/conexiones; latencia estable. |
| TC-P05 | **Volumen** | Ledger y `reputation_log` con millones de filas | proyecciones (saldo, trust_score) siguen dentro de SLO; índices sanos. |
| TC-P06 | **Ingesta webhook en ráfaga** | Burst de notificaciones MercadoPago | idempotencia mantiene 1 asiento/evento; cola no se pierde. |
| TC-P07 | **Conciliación bajo volumen** | Job §6.4 con gran ledger | completa en ventana; detecta descuadres inyectados. |

### 7.3 Resiliencia / caos (opcional, fases avanzadas)

- Caída del PSP a mitad de cargo → reintento/conciliación recupera (TC-P re-uso).
- Caída de la app entre "cargo aprobado" y "asiento" → webhook/conciliación cierra idempotente (doc 04 §10).
- Pérdida de un nodo → servicios críticos siguen (objetivo de resiliencia, doc 01 Cap.15).

---

## 8. Datos de prueba, ambientes y CI/CD

- **Fixtures deterministas:** usuarios cliente/profesional/empresa/admin, categorías (incl. sensible), cuentas de sistema (ESCROW/COMISION/PASARELA/REEMBOLSOS/RECUPERO/COSTO_PSP) sembradas.
- **PostGIS real en tests** vía Testcontainers (no mocks) — los índices GiST y los triggers deben probarse contra el motor real.
- **MercadoPago simulado:** sandbox + firmador HMAC de prueba para webhooks; nunca credenciales reales en CI.
- **Ambientes:** `local` → `ci` (efímero) → `staging` (sandbox PSP) → `prod`. Migraciones derivadas del MR (doc 08), versionadas.
- **Gates de CI (bloquean merge):** lint specs (Spectral) · unit+integración verdes · cobertura mínima · tests de seguridad dirigidos · smoke E2E de CU críticos. Performance corre en pipeline nocturno/pre-release, no en cada PR.
  - ✅ **Lint ya implementado:** ruleset `.spectral.yaml` (OAS+AsyncAPI + reglas propias: `x-source` y `summary` obligatorios) y workflow `.github/workflows/qa.yml` (`npm run lint:specs`). Falla solo ante severidad **error**; hoy: **0 errores** en ambos contratos.

---

## 9. Definition of Done (por función)

Una función se considera terminada cuando: (1) su CU tiene fila en la matriz (doc 09); (2) tiene tests unitarios de su lógica; (3) tiene test de contrato/integración; (4) los flujos alternos y de excepción del CU están cubiertos; (5) las reglas/invariantes que toca tienen test dedicado; (6) pasa el gate de seguridad aplicable; (7) si es ruta crítica, tiene escenario de carga. *(Operacionaliza la "regla del MVP y disciplina del propósito", doc 01 Cap.18.)*

---

## 10. Matriz de riesgo → prioridad de prueba

| Área | Impacto si falla | Prioridad QA |
|---|---|---|
| Dinero (ledger, escrow, comisión, retiros) | Pérdida financiera / fraude | **Máxima** (unit ≥95% + integración + seguridad + concurrencia) |
| Webhook / idempotencia | Doble cobro / doble pago | **Máxima** |
| Reputación (log, hash, double-blind) | Manipulación / injusticia | Alta |
| Autorización / geo-masking | Fuga de datos / riesgo físico | Alta |
| Matching / feed | Inequidad / mala UX | Media-alta (equidad + performance) |
| Catálogo / perfil | UX | Media |

---

## 11. Validación contra las restricciones de negocio

| Decisión de QA | Oportunidades | Confianza | Ética | Largo plazo |
|---|---|---|---|---|
| Tests derivados del contrato (SDD) | ➖ | ✅✅ conformidad demostrable | ✅ | ✅✅ regresión barata |
| Cobertura ≥95% en dinero/reputación | ➖ | ✅✅ anti-fraude | ✅ | ✅ |
| Concurrencia y performance como ciudadanos de primera | ✅ escala | ✅ | ✅ | ✅✅ |
| Riesgo→prioridad explícita | ➖ | ✅ foco correcto | ✅ honestidad | ✅ |

> **Cierre:** con 06–10 el proceso de diseño queda completo de extremo a extremo — **filosofía → arquitectura → contrato (specs) → casos de uso → datos (MER/MR) → trazabilidad → QA**. Lo pendiente es ejecución: reconciliar los últimos endpoints de las tablas nuevas, pasar 06–10 por el panel multirol, y generar el andamiaje de código y migraciones desde los specs.
