-- 0009 · Índices prioritarios — docs/08-MR.md §9

BEGIN;

-- Feed de oportunidades en vivo (GiST geográfico + filtros)
CREATE INDEX idx_opp_geo    ON oportunidad USING gist (geo_aprox);
CREATE INDEX idx_opp_feed   ON oportunidad (tipo, estado, categoria_id);

-- Cobertura del profesional (matching por cercanía)
CREATE INDEX idx_prof_geo   ON neatprofile USING gist (cobertura_centro);

-- Ranking de NeatMatch por reputación
CREATE INDEX idx_trust_rank ON trust_score (valor_0_100 DESC);

-- Equidad de NeatMatch: impresiones recientes por profesional/categoría (ventana 14d)
CREATE INDEX idx_impr_window ON match_impression (profesional_id, categoria_id, creado_en DESC);

-- Billetera: movimientos por cuenta y por transacción
CREATE INDEX idx_ledger_wallet ON ledger_entry (wallet_id, creado_en DESC);
CREATE INDEX idx_ledger_tx     ON ledger_entry (transaccion_id);

-- Reputación pública de un evaluado (solo lo visible)
CREATE INDEX idx_eval_evaluado ON evaluacion (evaluado_id) WHERE visible;

-- Reputación por usuario en el log
CREATE INDEX idx_replog_usuario ON reputation_log (usuario_id, creado_en);

-- Índices de FK usadas en joins/filtros/cascadas (PostgreSQL no los crea solo)
CREATE INDEX idx_opp_cliente    ON oportunidad (cliente_id);
CREATE INDEX idx_opp_categoria  ON oportunidad (categoria_id);
CREATE INDEX idx_post_prof      ON postulacion (profesional_id);
CREATE INDEX idx_eval_evaluador ON evaluacion (evaluador_id);
CREATE INDEX idx_pago_acuerdo   ON pago (acuerdo_id);
CREATE INDEX idx_disputa_abre   ON disputa (abierta_por);
CREATE INDEX idx_empmiembro_usuario ON empresa_miembro (usuario_id);  -- soporta el ON DELETE CASCADE

-- Hilo de la Sala de Acuerdo (chat y ofertas): consultas WHERE acuerdo_id ORDER BY creado_en
CREATE INDEX idx_mensaje_acuerdo ON mensaje (acuerdo_id, creado_en);
CREATE INDEX idx_offer_acuerdo   ON price_offer (acuerdo_id, creado_en);

-- Un pago de MercadoPago ↔ una sola fila `pago` (evita duplicados; NULL para topups internos)
CREATE UNIQUE INDEX pago_mp_uq   ON pago (mp_payment_id) WHERE mp_payment_id IS NOT NULL;

COMMIT;
