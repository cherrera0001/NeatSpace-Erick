-- 0006 · NeatWallet (dinero, partida doble) — docs/08-MR.md §6

BEGIN;

CREATE TABLE neatwallet (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        wallet_tipo NOT NULL,
  usuario_id  uuid UNIQUE REFERENCES usuario(id),
  empresa_id  uuid UNIQUE REFERENCES empresa(id),
  rol_sistema wallet_rol_sistema,
  moneda      char(3) NOT NULL DEFAULT 'CLP',
  creado_en   timestamptz NOT NULL DEFAULT now(),
  -- IN-1: identidad XOR (forma booleana explícita: tipos mixtos uuid/uuid/enum)
  CONSTRAINT wallet_identidad_xor CHECK (
    (usuario_id IS NOT NULL)::int + (empresa_id IS NOT NULL)::int + (rol_sistema IS NOT NULL)::int = 1
  ),
  CONSTRAINT wallet_tipo_coherente CHECK (
    (tipo='usuario' AND usuario_id IS NOT NULL) OR
    (tipo='empresa' AND empresa_id IS NOT NULL) OR
    (tipo='sistema' AND rol_sistema IS NOT NULL)
  ),
  CONSTRAINT wallet_rol_sistema_uq UNIQUE (rol_sistema)   -- una sola ESCROW/COMISION/... (NULLs no colisionan)
);

-- FK diferida de empresa.wallet_id (la tabla ya existe)
ALTER TABLE empresa ADD CONSTRAINT empresa_wallet_fk
  FOREIGN KEY (wallet_id) REFERENCES neatwallet(id);

CREATE TABLE pago (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acuerdo_id    uuid REFERENCES acuerdo(id),   -- NULL en topups (no atados a acuerdo)
  mp_payment_id text,
  estado        pago_estado NOT NULL DEFAULT 'pendiente',
  monto         bigint NOT NULL CHECK (monto > 0),
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mercadopago_event (   -- APPEND-ONLY: idempotencia del webhook (trigger en 0010)
  id           text PRIMARY KEY,      -- event-id de MercadoPago (dedup)
  pago_id      uuid REFERENCES pago(id),
  payload      jsonb NOT NULL,
  procesado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transaccion (   -- APPEND-ONLY: agrupador balanceado (trigger en 0010)
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo               tx_tipo NOT NULL,
  referencia_dominio text,
  idempotency_key    text UNIQUE NOT NULL,   -- RN-1
  creado_en          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entry (   -- APPEND-ONLY: el asiento (trigger en 0010)
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaccion_id uuid NOT NULL REFERENCES transaccion(id),
  wallet_id      uuid NOT NULL REFERENCES neatwallet(id),
  direccion      ledger_dir NOT NULL,
  monto          bigint NOT NULL CHECK (monto > 0),
  concepto       text,
  creado_en      timestamptz NOT NULL DEFAULT now()
);

-- IN-2: transacción balanceada (Σ débitos = Σ créditos, >=2 asientos), diferido al commit
CREATE OR REPLACE FUNCTION check_tx_balance()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d bigint; c bigint; n int;
BEGIN
  SELECT
    coalesce(sum(monto) FILTER (WHERE direccion='debito'),0),
    coalesce(sum(monto) FILTER (WHERE direccion='credito'),0),
    count(*)
  INTO d, c, n
  FROM ledger_entry WHERE transaccion_id = NEW.transaccion_id;
  IF n < 2 OR d <> c THEN
    RAISE EXCEPTION 'Transacción % desbalanceada: débitos=% créditos=% asientos=%',
      NEW.transaccion_id, d, c, n;
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER tx_balance_chk
  AFTER INSERT ON ledger_entry
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_tx_balance();

COMMIT;
