-- 0010 · Reglas append-only e inmutabilidad — docs/08-MR.md §10

BEGIN;

-- Tablas append-only: bloquear UPDATE y DELETE (IN-3)
CREATE TRIGGER ao_ledger  BEFORE UPDATE OR DELETE ON ledger_entry
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER ao_tx      BEFORE UPDATE OR DELETE ON transaccion
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER ao_version BEFORE UPDATE OR DELETE ON acuerdo_version
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER ao_aceptar BEFORE UPDATE OR DELETE ON acuerdo_aceptacion
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER ao_offer   BEFORE UPDATE OR DELETE ON price_offer
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER ao_replog  BEFORE UPDATE OR DELETE ON reputation_log
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER ao_urgente BEFORE UPDATE OR DELETE ON aceptacion_urgente
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER ao_impr    BEFORE UPDATE OR DELETE ON match_impression
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER ao_mpevent BEFORE UPDATE OR DELETE ON mercadopago_event
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER ao_doctrib BEFORE UPDATE OR DELETE ON documento_tributario
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER ao_admin   BEFORE DELETE ON admin_action   -- solo DELETE (checker_id se completa 1 vez)
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

-- evaluacion: inmutable salvo `visible` (double-blind) y `comentario` (moderación/tombstone PII, Ley 21.719).
-- Se bloquea todo cambio en los campos que forman la SEÑAL de reputación.
CREATE OR REPLACE FUNCTION evaluacion_solo_visible_comentario()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.servicio_id  <> OLD.servicio_id
  OR NEW.evaluador_id <> OLD.evaluador_id
  OR NEW.evaluado_id  <> OLD.evaluado_id
  OR NEW.estrellas    <> OLD.estrellas
  OR NEW.atributos    <> OLD.atributos
  OR NEW.creado_en    <> OLD.creado_en THEN
    RAISE EXCEPTION 'evaluacion es inmutable salvo visible/comentario (señal de reputación protegida)';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER eval_signal_guard BEFORE UPDATE ON evaluacion
  FOR EACH ROW EXECUTE FUNCTION evaluacion_solo_visible_comentario();

-- admin_action: append-only salvo fijar `checker_id` UNA vez (NULL→valor). Protege la
-- evidencia de auditoría maker-checker (RN-9): ao_admin ya bloquea DELETE; esto bloquea
-- reescribir maker_id/tipo/objetivo/motivo o revertir/cambiar checker_id.
CREATE OR REPLACE FUNCTION admin_action_solo_checker()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo     <> OLD.tipo
  OR NEW.objetivo <> OLD.objetivo
  OR NEW.motivo   <> OLD.motivo
  OR NEW.maker_id <> OLD.maker_id
  OR NEW.creado_en <> OLD.creado_en
  OR OLD.checker_id IS NOT NULL THEN
    RAISE EXCEPTION 'admin_action es append-only salvo fijar checker_id una vez (RN-9)';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER admin_action_guard BEFORE UPDATE ON admin_action
  FOR EACH ROW EXECUTE FUNCTION admin_action_solo_checker();

COMMIT;
