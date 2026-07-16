-- 0003 · Identidad y catálogo — docs/08-MR.md §3

BEGIN;

CREATE TABLE usuario (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              citext UNIQUE NOT NULL,
  password_hash      text NOT NULL,
  estado             usuario_estado NOT NULL DEFAULT 'activo',
  nivel_verificacion smallint NOT NULL DEFAULT 0 CHECK (nivel_verificacion BETWEEN 0 AND 3),
  creado_en          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE neatprofile (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id         uuid NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
  nombre             text,                    -- nombre visible de la persona
  descripcion        text,                    -- texto libre del perfil (bio)
  habilidades        text[] NOT NULL DEFAULT '{}',
  cobertura_centro   geometry(Point,4326),
  cobertura_radio_km numeric(6,2),
  creado_en          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE empresa (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social text NOT NULL,
  giro         text,
  creado_en    timestamptz NOT NULL DEFAULT now()
);
-- La billetera corporativa se deriva del vínculo autoritativo neatwallet.empresa_id
-- (UNIQUE + wallet_tipo_coherente, 0006). Se eliminó el back-pointer empresa.wallet_id
-- porque era redundante y no verificado (podía apuntar a cualquier billetera).

CREATE TABLE empresa_miembro (
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  rol        text NOT NULL,
  permisos   jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (empresa_id, usuario_id)
);

CREATE TABLE categoria (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    text NOT NULL,
  parent_id uuid REFERENCES categoria(id),
  nivel     smallint NOT NULL CHECK (nivel BETWEEN 1 AND 4),
  sensible  boolean NOT NULL DEFAULT false
);

COMMIT;
