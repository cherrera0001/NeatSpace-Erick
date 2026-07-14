# Matriz de Trazabilidad — NeatSpace
### Tomo Técnico IX · La columna vertebral SDD

**Base:** `docs/06-Casos-de-Uso.md` (CU + RN), `docs/07-MER.md` (IN), `docs/08-MR.md` (tablas), `specs/openapi.yaml` (endpoints), `specs/asyncapi.yaml` (eventos). Esta matriz demuestra que **nada existe sin justificación y nada queda sin cubrir**: cada caso de uso se enlaza con su contrato, sus datos y sus reglas. Es el artefacto que el paso de QA (`docs/10`) usa para garantizar cobertura.

> **Cómo leerla.** Una fila sin endpoint/evento = trabajo interno o *gap* declarado. Una tabla sin CU = candidata a datos huérfanos. Una regla sin fila = regla no ejercida (riesgo de test faltante).

---

## 1. Matriz principal (CU → contrato → datos → reglas)

| CU | Endpoint(s) | Evento(s) | Tablas | Reglas / Invariantes |
|---|---|---|---|---|
| CU-01 Registrarse | `POST /auth/register` | — | usuario, neatprofile, neatwallet | IN-1 |
| CU-02 Login | `POST /auth/login` | — | usuario | — |
| CU-03 Editar perfil | `PATCH /me/profile`, `GET /profiles/{id}` | — | neatprofile | RN-7 |
| CU-04 Categorías | `GET /categories` | — | categoria | — |
| CU-05 Publicar oportunidad | `POST /opportunities` | `OportunidadCreada` | oportunidad, oportunidad_recurrente | IN-5, RN-6 |
| CU-06 Explorar feed | `GET /opportunities`, `.../{id}` | — | oportunidad | RN-6 |
| CU-07 Postular | `POST /opportunities/{id}/applications` | — | postulacion | — |
| CU-08 Ver postulaciones | `GET /opportunities/{id}/applications` | — | postulacion | RN-7 |
| CU-09 Matches (ranking) | `GET /opportunities/{id}/matches` | — | trust_score, match_impression | RN-7 |
| CU-10 Asignación urgente | *(dispatch interno)* | `OportunidadTomada` | oportunidad, aceptacion_urgente | IN-3 |
| CU-11 Abrir sala | `POST /opportunities/{id}/agreement`, `GET /agreements/{id}` | — | acuerdo | IN-6 |
| CU-12 Proponer versión | `POST /agreements/{id}/versions` | — | acuerdo_version | IN-3 |
| CU-13 Precio Justo | `POST /agreements/{id}/price-offers`, `.../accept` | — | price_offer, acuerdo_version | IN-3 |
| CU-14 Aceptar (step-up) | `POST /agreements/{id}/accept` | `AcuerdoAceptado`, `DireccionRevelada`, `RetencionEscrowFallida` | acuerdo, acuerdo_aceptacion, transaccion, ledger_entry | RN-4, RN-6, IN-2 |
| CU-15 Enmienda | `POST /agreements/{id}/amendments` | — | acuerdo_version, transaccion | IN-2, IN-3 |
| CU-16 Entregado | `POST /agreements/{id}/deliver` | `TrabajoEntregado` | acuerdo | — |
| CU-17 Confirmar/cerrar | `POST /agreements/{id}/confirm` → `.../release` | `ServicioPagado`, `EscrowLiberado` | acuerdo, transaccion, ledger_entry | RN-2, RN-4, IN-2 |
| CU-18 Cancelar | `POST /agreements/{id}/cancel` | `AcuerdoCancelado` | acuerdo, transaccion | IN-2 |
| CU-19 Mensajería | `GET/POST /agreements/{id}/messages` | — | mensaje | RN-10 |
| CU-20 Ejecutar servicio | `POST /services/{id}/start`, `.../finish` | `ServicioFinalizado` | acuerdo | — |
| CU-21 Abonar (topup) | `POST /wallet/topup` | — | pago, transaccion, ledger_entry | RN-1, RN-3, IN-2 |
| CU-22 Retener escrow | `POST /services/{id}/hold` | — | transaccion, ledger_entry | RN-1, IN-2 |
| CU-23 Liberar escrow | `POST /services/{id}/release` | `EscrowLiberado` | transaccion, ledger_entry | RN-1, RN-2, RN-4, IN-2 |
| CU-24 Reembolsar/dividir | `POST /services/{id}/refund` | `ReembolsoEmitido` | transaccion, ledger_entry | RN-2, RN-9, IN-2 |
| CU-25 Retirar | `POST /wallet/withdraw` | — | transaccion, ledger_entry | RN-1, IN-2 |
| CU-26 Webhook pago | `POST /webhooks/mercadopago` | `ContracargoRecibido` | pago, mercadopago_event, transaccion | RN-3, IN-2, IN-3 |
| CU-27 Ver billetera | `GET /wallet`, `.../transactions/{id}` | — | neatwallet, ledger_entry, transaccion | RN-7 |
| CU-28 Conciliar | *(job)* | — | ledger_entry, pago | — |
| CU-29 Evaluar | `POST /services/{id}/reviews` | `EvaluacionEnviada` | evaluacion, reputation_log, trust_score | RN-5, RN-8, IN-4, IN-8 |
| CU-30 Ver Trust Score | `GET /profiles/{id}/trust-score`, `.../reputation` | — | trust_score, reputation_log | RN-7, RN-8 |
| CU-31 Recomputar | `POST /internal/reputation/recompute/{id}` | — | trust_score, reputation_log | IN-7, IN-8 |
| CU-32 Abrir disputa | `POST /services/{id}/disputes` | — | disputa, acuerdo | — |
| CU-33 Resolver disputa | *(interno → refund/release)* | `ReembolsoEmitido`/`EscrowLiberado` | disputa, transaccion, ledger_entry | RN-9, IN-2 |
| CU-34 Acción admin | *(interno)* | — | admin_action | RN-9 |
| CU-35 Apelar | *(interno → log)* | — | reputation_log | IN-8 |

---

## 2. Índice inverso: endpoint → CU (detección de endpoints huérfanos)

Los 35 paths de `openapi.yaml` mapean a CU-01..09, 11..27, 29..32. **Sin endpoint público** (por diseño, internos/jobs/dispatch): CU-10, CU-28, CU-33, CU-34, CU-35. **Ningún endpoint queda sin CU.** ✅

## 3. Índice inverso: regla → CU (asegura que toda regla se ejerce)

| Regla | CU que la ejercen | ¿Cubierta? |
|---|---|---|
| RN-1 Idempotency-Key | CU-21..25 | ✅ |
| RN-2 Comisión server-side | CU-23, CU-24, CU-17 | ✅ |
| RN-3 Webhook fuente de verdad | CU-21, CU-26 | ✅ |
| RN-4 Liberación no unilateral | CU-14, CU-17, CU-23 | ✅ |
| RN-5 Sin pago no hay reseña | CU-29 | ✅ |
| RN-6 Geo enmascarada | CU-05, CU-06, CU-14 | ✅ |
| RN-7 Anti-IDOR | CU-03, CU-08, CU-09, CU-27, CU-30 | ✅ |
| RN-8 Reputación derivada | CU-29, CU-30, CU-31 | ✅ |
| RN-9 Maker-checker | CU-24, CU-33, CU-34 | ✅ |
| RN-10 NeatAI solo advierte | CU-19, CU-33 | ✅ |
| IN-1..8 (invariantes de datos) | CU-01,10,12-15,17,21-26,29,31,33,35 | ✅ |

## 4. Índice inverso: tabla → CU (detección de datos huérfanos)

Las tablas del MR aparecen en ≥1 CU. **Sin CU de escritura directa aún:** `empresa_miembro` (CU-38, NeatBusiness), `documento_tributario` (se emite en la liberación, CU-17/23 — gancho fiscal a detallar) y `oportunidad_recurrente` (CU-41). Se registran como *gaps* a cubrir al detallar esos módulos.

---

## 5. Gaps declarados (honestidad de cobertura)

| Gap | Naturaleza | Acción |
|---|---|---|
| CU-10, 28, 33, 34, 35 sin endpoint público | Internos / jobs / dispatch | Definir contrato interno o AsyncAPI cuando se implementen. |
| `empresa_miembro` sin CU de escritura | NeatBusiness sin detallar | CU de administración de empresa (backlog). |
| `EmpresaMiembro`/`Postulacion`/`Disputa`/… recién reconciliadas | Nuevas en `entities.yaml` | Falta exponerlas en endpoints/eventos donde aplique. |
| CU-37 consentimiento de datos sin contrato | Requisito Ley 21.719 | Definir onboarding + endpoint de consentimiento. |
| `documento_tributario` sin flujo de emisión | Gancho fiscal Ley 21.713/SII | Definir servicio de emisión al liberar (CU-17/23). |
| CU-36, 38–42 (auth extra, NeatBusiness, jobs) | Complementarios (doc 06 §2.1) | Contrato al implementar cada módulo. |

---

## 6. Validación contra las restricciones de negocio

| Aspecto | Oportunidades | Confianza | Ética | Largo plazo |
|---|---|---|---|---|
| Cobertura bidireccional CU↔contrato↔datos↔reglas | ➖ | ✅✅ nada oculto | ✅ auditable | ✅✅ mantenible |
| Gaps declarados explícitamente | ✅ | ✅ honestidad | ✅ | ✅ |
| Reglas e invariantes con CU que las ejercen | ➖ | ✅✅ | ✅ | ✅ base para QA |

> **Siguiente:** `docs/10-QA-Testing.md` deriva de esta matriz los casos de prueba — cada CU, regla e invariante se convierte en al menos un test (unitario, funcional, de contrato, de seguridad o de carga).
