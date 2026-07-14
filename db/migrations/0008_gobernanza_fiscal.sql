-- 0008 · Gobernanza y fiscal — docs/08-MR.md §8

BEGIN;

CREATE TABLE admin_action (   -- APPEND-ONLY: maker-checker (trigger en 0010; RN-9)
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo       text NOT NULL,
  objetivo   text NOT NULL,
  motivo     text NOT NULL,
  maker_id   uuid NOT NULL REFERENCES usuario(id),
  checker_id uuid REFERENCES usuario(id),
  creado_en  timestamptz NOT NULL DEFAULT now(),
  CHECK (checker_id IS NULL OR checker_id <> maker_id)
);

-- Documento tributario y retención (Ley 21.713 / SII). APPEND-ONLY.
-- ⚠️ Gancho legal abierto: tipo de documento y retención a validar con contador/abogado.
CREATE TABLE documento_tributario (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaccion_id uuid REFERENCES transaccion(id),
  emisor_id      uuid REFERENCES usuario(id),
  receptor_id    uuid REFERENCES usuario(id),
  tipo           text NOT NULL,   -- boleta|factura|nota_credito|...
  monto_bruto    bigint NOT NULL CHECK (monto_bruto >= 0),
  retencion      bigint NOT NULL DEFAULT 0 CHECK (retencion >= 0),
  folio_sii      text,
  emitido_en     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doc_retencion_le_bruto CHECK (retencion <= monto_bruto)  -- imposible retener más que el bruto
);

COMMIT;
