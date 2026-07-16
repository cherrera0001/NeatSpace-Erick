-- 0007 · Reputación — docs/08-MR.md §7

BEGIN;

CREATE TABLE evaluacion (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id  uuid NOT NULL REFERENCES acuerdo(id),   -- servicio ≡ acuerdo
  evaluador_id uuid NOT NULL REFERENCES usuario(id),
  evaluado_id  uuid NOT NULL REFERENCES usuario(id),
  rol_evaluado parte_acuerdo,                 -- faceta evaluada (cliente|profesional): base de la segmentación por rol del Trust Score (doc 05)
  estrellas    smallint NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  atributos    jsonb NOT NULL DEFAULT '{}',
  comentario   text,                     -- moderado + PII-limpio antes de visible
  visible      boolean NOT NULL DEFAULT false,   -- double-blind (mutable; comentario también, por moderación/tombstone PII)
  creado_en    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (servicio_id, evaluador_id),     -- IN-4
  CHECK (evaluador_id <> evaluado_id)
);

CREATE TABLE reputation_log (   -- APPEND-ONLY encadenado por hash (trigger en 0010; IN-8)
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid NOT NULL REFERENCES usuario(id),
  evento        reput_evento NOT NULL,
  payload       jsonb NOT NULL,
  evaluacion_id uuid REFERENCES evaluacion(id),
  hash_prev     bytea,
  hash_actual   bytea NOT NULL,           -- H(hash_prev || payload)
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trust_score (   -- PROYECCIÓN recomputable (IN-7)
  neatprofile_id     uuid PRIMARY KEY REFERENCES neatprofile(id) ON DELETE CASCADE,
  valor_0_100        smallint NOT NULL DEFAULT 0 CHECK (valor_0_100 BETWEEN 0 AND 100),
  valor_bayesiano    numeric(6,4),
  atributos_0_100    jsonb NOT NULL DEFAULT '{}',
  n_evaluaciones     integer NOT NULL DEFAULT 0,
  nivel_verificacion smallint NOT NULL DEFAULT 0,
  recalculado_en     timestamptz NOT NULL DEFAULT now()
);

COMMIT;
