-- 0001 · Extensiones y utilidades
-- Deriva de docs/08-MR.md §1. Ejecutar en orden (0001..0010).
-- Convención: PK uuid; montos en BIGINT/CLP (implementa la recomendación
-- "bigint para B2B" del doc 08 §Convenciones); tiempos timestamptz; geo SRID 4326.

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- email case-insensitive

-- Cuenta no-nulos del MISMO tipo (NO usar para el XOR de billetera: tipos mixtos).
CREATE OR REPLACE FUNCTION num_nonnull(VARIADIC anyarray)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT count(*)::int FROM unnest($1) x WHERE x IS NOT NULL;
$$;

-- Guardia append-only: bloquea UPDATE/DELETE (IN-3).
CREATE OR REPLACE FUNCTION prevent_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Tabla append-only %: operación % no permitida', TG_TABLE_NAME, TG_OP;
END $$;

COMMIT;
