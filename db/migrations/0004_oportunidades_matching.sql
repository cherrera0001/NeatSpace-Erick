-- 0004 · Oportunidades y matching — docs/08-MR.md §4

BEGIN;

CREATE TABLE oportunidad_recurrente (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   uuid NOT NULL REFERENCES usuario(id),
  categoria_id uuid NOT NULL REFERENCES categoria(id),
  periodicidad text NOT NULL,
  activo       boolean NOT NULL DEFAULT true,
  creado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE oportunidad (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id          uuid NOT NULL REFERENCES usuario(id),
  tipo                oportunidad_tipo   NOT NULL,   -- INMUTABLE (trigger abajo, IN-5)
  categoria_id        uuid NOT NULL REFERENCES categoria(id),
  estado              oportunidad_estado NOT NULL DEFAULT 'publicado',
  geo_aprox           geometry(Point,4326) NOT NULL, -- feed: solo aproximada (RN-6)
  zona                text,
  direccion_texto     text,                          -- exacta; NULL hasta revelación
  precio_ref          bigint CHECK (precio_ref >= 0),
  recurrente_id       uuid REFERENCES oportunidad_recurrente(id),
  convertida_desde_id uuid REFERENCES oportunidad(id),
  fecha               timestamptz,
  descripcion         text,
  creado_en           timestamptz NOT NULL DEFAULT now()
);

-- IN-5: oportunidad.tipo inmutable
CREATE OR REPLACE FUNCTION opp_tipo_inmutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo <> OLD.tipo THEN
    RAISE EXCEPTION 'oportunidad.tipo es inmutable (IN-5)';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER opp_tipo_guard BEFORE UPDATE ON oportunidad
  FOR EACH ROW EXECUTE FUNCTION opp_tipo_inmutable();

CREATE TABLE postulacion (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidad_id uuid NOT NULL REFERENCES oportunidad(id) ON DELETE CASCADE,
  profesional_id uuid NOT NULL REFERENCES usuario(id),
  mensaje        text,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (oportunidad_id, profesional_id)
);

CREATE TABLE aceptacion_urgente (   -- APPEND-ONLY (trigger en 0010)
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidad_id uuid NOT NULL UNIQUE REFERENCES oportunidad(id),
  profesional_id uuid NOT NULL REFERENCES usuario(id),
  creado_en      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE match_impression (     -- APPEND-ONLY (trigger en 0010)
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profesional_id uuid NOT NULL REFERENCES usuario(id),
  categoria_id   uuid NOT NULL REFERENCES categoria(id),
  zona           text,
  creado_en      timestamptz NOT NULL DEFAULT now()
);

COMMIT;
