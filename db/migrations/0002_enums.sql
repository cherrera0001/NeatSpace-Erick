-- 0002 · Dominios (enums) — docs/08-MR.md §2

BEGIN;

CREATE TYPE usuario_estado     AS ENUM ('activo','suspendido');
CREATE TYPE oportunidad_tipo   AS ENUM ('urgent','scheduled');
CREATE TYPE oportunidad_estado AS ENUM ('publicado','tomada','cerrada','sin_cobertura');
CREATE TYPE acuerdo_estado     AS ENUM
  ('ABIERTA','PROPUESTA','PAGO_FALLIDO','ACORDADO','EN_EJECUCION',
   'ENTREGADO','EN_DISPUTA','CERRADO','CANCELADO','EXPIRADO');
CREATE TYPE parte_acuerdo      AS ENUM ('cliente','profesional');
CREATE TYPE metodo_verif       AS ENUM ('pin','biometria','otro');
CREATE TYPE wallet_tipo        AS ENUM ('usuario','empresa','sistema');
CREATE TYPE wallet_rol_sistema AS ENUM ('escrow','comision','pasarela','reembolsos','recupero','costo_psp');
CREATE TYPE tx_tipo            AS ENUM ('topup','retencion','liberacion','reembolso','reverso','retiro');
CREATE TYPE ledger_dir         AS ENUM ('debito','credito');
CREATE TYPE pago_estado        AS ENUM ('pendiente','confirmado','fallido','reembolsado','contracargo');
CREATE TYPE reput_evento       AS ENUM ('evaluacion','sancion','verificacion','apelacion','decay');
CREATE TYPE disputa_resolucion AS ENUM ('pagado','reembolsado','dividido');

COMMIT;
