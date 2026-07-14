-- 0005 · Sala de Acuerdo — docs/08-MR.md §5

BEGIN;

CREATE TABLE acuerdo (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidad_id       uuid UNIQUE REFERENCES oportunidad(id),   -- 0..1 (IN-6)
  estado               acuerdo_estado NOT NULL DEFAULT 'ABIERTA',
  version_vigente_n    integer,
  aceptado_cliente     boolean NOT NULL DEFAULT false,
  aceptado_profesional boolean NOT NULL DEFAULT false,
  ttl_vence            timestamptz,
  creado_en            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE acuerdo_version (   -- APPEND-ONLY: snapshot inmutable (trigger en 0010)
  acuerdo_id        uuid NOT NULL REFERENCES acuerdo(id) ON DELETE CASCADE,
  n                 integer NOT NULL,
  precio            bigint NOT NULL CHECK (precio >= 0),
  duracion          text,
  materiales        text,
  responsabilidades text,
  condiciones       text,
  creado_en         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (acuerdo_id, n)
);

CREATE TABLE acuerdo_aceptacion (   -- APPEND-ONLY: no repudio (trigger en 0010)
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acuerdo_id  uuid NOT NULL REFERENCES acuerdo(id) ON DELETE CASCADE,
  version_n   integer NOT NULL,
  parte       parte_acuerdo NOT NULL,
  metodo      metodo_verif NOT NULL,
  aceptado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (acuerdo_id, version_n, parte),
  FOREIGN KEY (acuerdo_id, version_n) REFERENCES acuerdo_version(acuerdo_id, n)
);

CREATE TABLE price_offer (   -- APPEND-ONLY: Precio Justo (trigger en 0010)
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acuerdo_id    uuid NOT NULL REFERENCES acuerdo(id) ON DELETE CASCADE,
  autor_id      uuid NOT NULL REFERENCES usuario(id),
  monto         bigint NOT NULL CHECK (monto >= 0),
  justificacion text NOT NULL,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mensaje (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acuerdo_id    uuid NOT NULL REFERENCES acuerdo(id) ON DELETE CASCADE,
  autor_id      uuid NOT NULL REFERENCES usuario(id),
  texto         text NOT NULL,
  leido         boolean NOT NULL DEFAULT false,
  alerta_neatai text,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE disputa (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acuerdo_id    uuid NOT NULL UNIQUE REFERENCES acuerdo(id),
  abierta_por   uuid NOT NULL REFERENCES usuario(id),
  motivo        text NOT NULL,
  evidencia_url text,
  resolucion    disputa_resolucion,
  resuelto_en   timestamptz,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

COMMIT;
