-- Tests de constraints contra PostgreSQL real (se corren en CI tras las migraciones).
-- Verifican invariantes que la BD DEBE garantizar (docs/10 TC-I01/TC-I02).
-- Cada bloque provoca una violación y espera el error; si NO se lanza, falla con RAISE.
-- Se ejecuta con psql -v ON_ERROR_STOP=1, así que un RAISE 'FALLO...' aborta el job.

-- Datos mínimos de apoyo
INSERT INTO usuario (id, email, password_hash)
  VALUES ('11111111-1111-1111-1111-111111111111', 'a@test.cl', 'x')
  ON CONFLICT DO NOTHING;

-- ── IN-1: XOR de identidad de billetera ──────────────────────────────────────
-- (a) doble identidad (usuario_id + rol_sistema) debe ser rechazada
DO $$
BEGIN
  INSERT INTO neatwallet (tipo, usuario_id, rol_sistema)
    VALUES ('usuario', '11111111-1111-1111-1111-111111111111', 'escrow');
  RAISE EXCEPTION 'FALLO TC-I01a: se aceptó una billetera con doble identidad';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'OK TC-I01a: XOR rechaza doble identidad';
END $$;

-- (b) sin identidad alguna debe ser rechazada
DO $$
BEGIN
  INSERT INTO neatwallet (tipo) VALUES ('sistema');
  RAISE EXCEPTION 'FALLO TC-I01b: se aceptó una billetera sin identidad';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'OK TC-I01b: XOR rechaza billetera sin identidad';
END $$;

-- ── IN-2: partida doble balanceada ───────────────────────────────────────────
-- Una transacción con un único asiento (n<2) debe fallar al COMMIT (constraint diferido).
DO $$
DECLARE w1 uuid; w2 uuid; tx uuid;
BEGIN
  INSERT INTO neatwallet (tipo, rol_sistema) VALUES ('sistema','escrow') RETURNING id INTO w1;
  INSERT INTO neatwallet (tipo, rol_sistema) VALUES ('sistema','comision') RETURNING id INTO w2;
  INSERT INTO transaccion (tipo, idempotency_key) VALUES ('liberacion','k-desbalance') RETURNING id INTO tx;
  INSERT INTO ledger_entry (transaccion_id, wallet_id, direccion, monto)
    VALUES (tx, w1, 'debito', 1000);   -- falta el crédito → desbalanceada
  -- forzar la verificación diferida:
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE EXCEPTION 'FALLO TC-I02: se aceptó una transacción desbalanceada';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'FALLO%' THEN RAISE; END IF;
  RAISE NOTICE 'OK TC-I02: se rechazó la transacción desbalanceada (%).', SQLERRM;
END $$;

-- ── IN-3: append-only (ledger_entry no admite UPDATE) ────────────────────────
DO $$
DECLARE w1 uuid; w2 uuid; tx uuid; le uuid;
BEGIN
  INSERT INTO neatwallet (tipo, rol_sistema) VALUES ('sistema','pasarela') RETURNING id INTO w1;
  INSERT INTO neatwallet (tipo, usuario_id)
    VALUES ('usuario','11111111-1111-1111-1111-111111111111') RETURNING id INTO w2;
  INSERT INTO transaccion (tipo, idempotency_key) VALUES ('topup','k-ok') RETURNING id INTO tx;
  INSERT INTO ledger_entry (transaccion_id, wallet_id, direccion, monto) VALUES (tx, w1, 'debito', 500);
  INSERT INTO ledger_entry (transaccion_id, wallet_id, direccion, monto)
    VALUES (tx, w2, 'credito', 500) RETURNING id INTO le;
  SET CONSTRAINTS ALL IMMEDIATE;           -- esta transacción SÍ balancea
  BEGIN
    UPDATE ledger_entry SET monto = 999 WHERE id = le;
    RAISE EXCEPTION 'FALLO TC-I03: se permitió UPDATE en ledger_entry (append-only)';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALLO%' THEN RAISE; END IF;
    RAISE NOTICE 'OK TC-I03: ledger_entry rechaza UPDATE (%).', SQLERRM;
  END;
END $$;

SELECT 'constraints_test: OK' AS resultado;
