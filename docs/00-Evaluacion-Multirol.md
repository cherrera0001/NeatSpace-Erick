# Informe de Evaluacion Multirol de Entregables — NeatSpace

**Fecha:** 2026-07-13

## Resumen del ciclo

Se ejecuto un ciclo de evaluacion multirol sobre los entregables de NeatSpace. En una primera tanda pasaron 01/02/03 y el Manifiesto-Editado; en una segunda tanda (con lentes de contabilidad de partida doble, seguridad, legal-fintech, producto y adversario) pasaron **04-NeatWallet** y **05-Trust-Score**. Todos los archivos se **cerraron** tras aplicar mejoras quirurgicas, preservando la voz, el estilo y las referencias existentes de cada documento. No se reescribieron secciones completas (salvo la creacion de nuevas subsecciones donde la mejora lo exigia) ni se introdujo informacion inventada.

## Estado por entregable

| Archivo | Estado | N.o de cambios |
| --- | --- | --- |
| docs/01-Arquitectura-NeatSpace.md | Cerrado sin cambios pendientes (con mejoras aplicadas) | 20 |
| docs/02-NeatMatch.md | Cerrado sin cambios pendientes (con mejoras aplicadas) | 12 |
| docs/03-Sala-de-Acuerdo.md | Cerrado sin cambios pendientes (con mejoras aplicadas) | 18 |
| docs/04-NeatWallet.md | Cerrado sin cambios pendientes (con mejoras aplicadas) | 6 |
| docs/05-Trust-Score.md | Cerrado sin cambios pendientes (con mejoras aplicadas) | 7 |
| Manifiesto-Editado.md | Cerrado sin cambios pendientes (con mejoras aplicadas) | 6 |

## Cambios aplicados

### docs/01-Arquitectura-NeatSpace.md (20 cambios)

1. **§1.2 Diagrama ER (Mermaid):** relacion OPORTUNIDAD ||--|| ACUERDO cambiada a ||--o| para reflejar opcionalidad (0..1), consistente con la tabla de entidades y el FK UQ del esquema.
2. **§1.4 Mapa de Datos:** anadida excepcion declarada de estado acotado (opcion b): contenido de negocio inmutable, pero `mensaje.leido` y `aceptado_cliente/profesional` como flags acotados, con nota de alternativa append-only preferida a futuro.
3. **§1.4 (nota):** doble autorizacion maker-checker (dos administradores) para todo reverso manual de LedgerEntry o entrada correctiva en ReputationLog, registrado como AdminAction con motivo obligatorio y alertas por umbrales.
4. **§3.1 Flujo A:** asignacion atomica con exclusion mutua (UPDATE ... WHERE estado='publicado', primero gana, 409 a perdedores), evento OportunidadTomada y entidad auditable `aceptacion_urgente`.
5. **§3.1 Flujo C:** maquina de estados de liberacion de escrow: /finish abre ventana de disputa; /release solo con confirmacion dual o auto-liberacion al vencer; disputa congela el escrow; sin liberacion unilateral.
6. **§1.3 MR (neatwallet) + empresa:** neatwallet admite usuario_id/empresa_id NULL con tipo y rol_sistema, CHECK de identidad XOR, y facturacion de Empresa via wallet corporativo 1-1.
7. **§1.3 (bloque nuevo):** asientos de partida doble con cuentas de sistema (Σdebitos=Σcreditos) y politica de comision ante reembolso.
8. **§3.3 API (NeatWallet/Pagos):** POST /v1/webhooks/mercadopago como fuente de verdad del Pago; /pay solo inicia el intento; firma/HMAC, idempotencia, anti-replay, estados intermedios y job de reconciliacion.
9. **§3.3 reglas de negocio:** geolocalizacion enmascarada: feed y GET /v1/opportunities exponen solo geo aproximada; direccion exacta solo con Acuerdo aceptado o urgente asignado.
10. **§2.3.1 (punto 9):** evaluacion bidireccional double-blind con publicacion simultanea para evitar coercion/represalia.
11. **§2.3.1 (punto 10):** deteccion de desintermediacion (reglas + NeatAI) con marcado para revision y degradacion temporal de visibilidad, sin sancion automatica ciega (Art. IX).
12. **§2.2 Capas (NeatAI, Pilar IV):** entradas de usuario como no confiables (anti prompt injection, sin accion automatica sin revision) y minimizacion/anonimizacion previa al LLM externo con DPA.
13. **§2.4 (nueva subseccion):** Proteccion de Datos Personales (Ley 21.719): separacion contenido/PII con pseudonimizacion, clasificacion por sensibilidad, retencion por tipo y DPA/transferencia internacional.
14. **§2.5 (nueva subseccion):** Estructura legal y regulatoria (Chile): custodia de fondos (Ley Fintech 21.521/CMF), DocumentoTributario y retencion previsional (SII, Ley 21.713), Ley 21.431, Ley 19.496 y dependencia de un unico PSP.
15. **§1.3 MR:** entidad `oportunidad_recurrente` (periodicidad/schedule) que genera Oportunidades concretas (Cap. 37).
16. **§2.3.1 punto 4:** estado de UI de cold start del Trust Score con badge "Nuevo en NeatSpace" / "Sin historial aun".
17. **§3.2 Stack Tecnologico:** accesibilidad como requisito no funcional de primera clase (WCAG 2.1 AA, componentes accesibles y gate de CI, Cap. 44).
18. **§4 Analisis de Mockups:** cada brecha etiquetada como "Bloqueante MVP" o "Post-MVP"; Trust Score visible y Sala de Acuerdo marcadas como bloqueantes.
19. **§3.5 Regla del minimo esfuerzo:** validacion separada en pasos de API (<=2 endpoints) y pasos de UI percibidos, verificados contra el mockup real.
20. **§1.3 Indices prioritarios para NeatMatch:** placeholder de indice/estrategia de equidad para no pre-sesgar la capa de datos hacia el ranking por reputacion.

### docs/02-NeatMatch.md (12 cambios)

1. **§7, §9, §11:** fallback SinCobertura reescrito para no mutar `oportunidad.tipo` (inmutable): crea oportunidad programada enlazada (FK convertida_desde_id) y la urgente pasa a cerrada/sin_cobertura.
2. **§4.4, §6.4:** definicion precisa de `impresiones_recientes(p)`: contador server-side en shortlist real, ventana 14 dias, ambito por categoria/zona, entidad `match_impression` y monitoreo de anomalias.
3. **§4.2, §9, §11:** nuevo filtro duro #7 anti-auto-contratacion/anti-Sybil (cliente_id + fingerprint de cuentas ligadas/suspendidas) para todas las categorias.
4. **§6.3, §7, §10:** reduccion de precision geografica: distancia agrupada en rangos, payload urgent_offer con geo aproximada, direccion exacta recien en la Sala de Acuerdo.
5. **§7, §2:** nuevo estado PendienteConfirmacionCliente para categorias de alto riesgo; "primero en aceptar gana" aclarado como solo dispatch general.
6. **§9, §4.4:** equidad diferenciada por modo: en urgente el boost afecta el orden pero omite reserva de cupos; reserva solo en Programado/Empresa.
7. **§10:** autorizacion explicita del endpoint /matches (RBAC), rate-limiting y no exponer Trust Score crudo con flag EMERGING a no-clientes (anti-IDOR).
8. **§4.3:** aclarado que "Empresa" no es un tercer modo sino variante parametrica del modo Programado (B2B, Cap. 37).
9. **§5:** tope explicito al desplazamiento de peso de la preferencia "Precio" y piso garantizado para Trust Score y Cumplimiento.
10. **§4.4, §6.4, §8, §11:** etiquetado de fase MVP/V1 vs V2+ en las secciones relevantes.
11. **§6.2, §4.2:** via de entrada supervisada para categorias de riesgo (cupo de oportunidades de prueba supervisadas) que resuelve el deadlock del filtro #6.
12. **§11:** nueva fila para el doble fallo de cobertura (lista de espera, ampliar categoria/radio, notificacion al reactivarse, contacto con soporte) y desambiguacion de la taxonomia de Pilares.

### docs/03-Sala-de-Acuerdo.md (18 cambios)

1. **§3:** camino de fallo de retencion de escrow: ACORDADO solo con retencion OK; nuevo estado PAGO_FALLIDO y transiciones PROPUESTA-->PAGO_FALLIDO-->PROPUESTA.
2. **§3:** desenlace de disputa diferenciado: EN_DISPUTA-->CERRADO (a favor del profesional) y EN_DISPUTA-->CANCELADO (a favor del cliente); subcampo `resolucion` ∈ {pagado, reembolsado, dividido}.
3. **§3:** hito intermedio ENTREGADO con confirmacion del cliente O vencimiento de ventana de reclamo (24-48h); eliminado el cierre unilateral EN_EJECUCION-->CERRADO.
4. **§2:** divulgacion progresiva de la Direccion (zona/comuna aproximada hasta ACORDADO, direccion exacta solo con escrow retenido) con nota anti-casing.
5. **§8:** viñeta NeatWallet indica que la retencion puede fallar (PAGO_FALLIDO), liberacion via ENTREGADO y dependencia del resultado.
6. **§8:** flowchart marca "(si falla → PAGO_FALLIDO)" y libera "segun resultado de la resolucion".
7. **§10:** eventos de dominio ampliados (RetencionEscrowFallida, DireccionRevelada, TrabajoEntregado, AcuerdoCancelado, AcuerdoExpirado); AcuerdoAceptado registra metodo de verificacion.
8. **§6 R8 + §12:** TTL por modo y versionado (urgente = minutos / programado = 24-48h configurable por categoria).
9. **§7 + §11:** comision visible obligatoria antes de aceptar (bruto, comision 20% + comisiones MercadoPago, neto).
10. **§7 + §9:** modo urgente con resumen minimo de 1 linea (Regla de los 3 segundos) y captura identidad+timestamp del rigor de R5.
11. **§2, §9, §6:** aplicabilidad de campos por modo (precio/direccion/duracion siempre; materiales/responsabilidades/condiciones relajables en urgente).
12. **§11:** backlog de UI ampliado (aviso de aceptacion invalidada por edicion y flujo para el 409 CONFLICT con refresco automatico).
13. **§7:** nueva capacidad de NeatAI: deteccion de contacto externo con alerta educativa y registro de riesgo ("solo advierte, no bloquea").
14. **§3 + §6 R3:** salvaguarda anti scope-creep en ENMIENDA (rechazo sin penalidad; sobre umbral % exige evidencia y/o alerta de NeatAI).
15. **§6 R10 + §12:** plazos de resolucion con default (liberacion parcial / arbitraje escalonado) y politica ante enmienda no re-aceptada.
16. **§4.1 + §6 R5 + §10:** step-up de identidad para no-repudio (PIN/biometria obligatorio sobre umbral de monto) registrado en el evento.
17. **§6 R5:** correccion de cita: "Debido proceso (Art. IX)" sustituido por "No repudio (Cap. 23); Identidad Verificada (Cap. 74 Pilar I)".
18. **§10:** endpoints de entrega/cierre POST /deliver (ENTREGADO) y POST /confirm (cliente confirma → CERRADO) con liberacion automatica al vencer la ventana.

### docs/04-NeatWallet.md (6 cambios)

1. **§2 + §5.8 (bloque nuevo):** cuenta de sistema `COSTO_PSP` y asiento de la comisión de MercadoPago (antes ausente pese a citarse en §7); quién la absorbe se marca como decisión de negocio abierta, aislada para poder cambiarla sin tocar el ledger.
2. **§5.3 + §7:** neto del profesional como **complemento exacto** `neto = total − comision` (nunca `round(total × 0.80)`) para no descuadrar la transacción balanceada en $1.
3. **§5.6 (clawback):** segunda pata `REEMBOLSOS → PASARELA` que refleja la salida real de fondos ante un contracargo y preserva el invariante #2 (Σ = 0); enlace explícito al traslado a `RECUPERO`.
4. **§9 (reglas embebidas):** autorización obligatoria y anti-IDOR — `/topup`, `/withdraw` y `GET /wallet*` solo del dueño; `GET /wallet/transactions/{id}` verifica pertenencia; `/hold`, `/release`, `/refund` internos con auth servicio-a-servicio.
5. **§2 (enum):** `rol_sistema` amplía a `costo_psp` de forma consistente con el plan de cuentas.
6. **Consistencia general:** cifras limpias de los mockups (`$15.000 → −$3.000 → recibe $12.000`) reconciliadas con el costo real del PSP como línea aparte.

### docs/05-Trust-Score.md (7 cambios)

1. **§2 (reglas de integridad):** el comentario pasa por **moderación y limpieza de PII** antes de publicarse (anti-difamación, Ley 21.719 y 19.496), es reportable y ocultable sin alterar el evento del log.
2. **§3:** conciliación **inmutabilidad vs. derechos de datos (Ley 21.719)** — separar dato numérico/hash (se preserva) del PII/comentario (redactable con *tombstone*, doc 01 §2.4); se borra el texto sin romper la cadena.
3. **§4.3 (`ω_evaluador`):** techo al peso del evaluador para evitar el bucle "el rico se hace más rico" y la oligarquía de cuentas semilla (tensión con Art. II y cold-start).
4. **§6:** las **sanciones graves de seguridad no decaen** como un mal rating: persisten hasta la ruta de rehabilitación explícita; un mal actor no puede "esperar a que expire".
5. **§12 (caso borde):** perfil dual — Trust Score y atributos **segmentados por rol** (cliente vs. profesional); la mala conducta como cliente no contamina la reputación profesional.
6. **§11:** consistencia de estado — `409` cuando el servicio no está "pagado", aclarando que equivale al estado terminal `CERRADO` (doc 03) = escrow liberado (doc 04), no un estado aparte.
7. **§10:** aclarado el mapeo `trust_score.neatprofile_id` ↔ `reputation_log.usuario_id` (NeatProfile 1—1 con usuario, unidad de reputación).

### Manifiesto-Editado.md (6 cambios)

1. **Nota editorial (linea 11):** descripcion precisa de la intervencion (dar continuidad, condensar pasajes secundarios, reconstruir cierres cortados) con validacion por Erick antes de considerarse canonico; se modero "integramente" a "Se ha respetado la voz".
2. **Cap. 2:** marca de provenance en cursiva tras el blockquote de la vision. Verificado contra Manifiesto.md linea 159 (corta en "mas confiable d").
3. **Cap. 3:** marca de provenance tras el blockquote del juramento institucional. Verificado contra Manifiesto.md linea 258 (corta en "Prometo pr").
4. **Cap. 18:** marca de provenance tras la Declaracion del Fundador. Verificado contra Manifiesto.md linea 1747 (corta en "cada linea de codigo esc").
5. **Cap. 19:** restituido el bloque "El compromiso con la comunidad" con las seis promesas publicas de NeatSpace (contenido real, Manifiesto.md lineas 1806-1814).
6. **Cap. 23:** reintroducida la mencion del organo responsable del filtro del proposito (Comite del Proposito / Consejo de Innovacion, Cap. 4), contenido real del original (lineas 2178-2189).
