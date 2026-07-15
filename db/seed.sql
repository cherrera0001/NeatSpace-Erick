-- Datos de demostración para el stack local (idempotente: se puede correr varias veces).

-- Cuentas de sistema del ledger (una por rol)
INSERT INTO neatwallet (tipo, rol_sistema) VALUES
  ('sistema','escrow'), ('sistema','comision'), ('sistema','pasarela'),
  ('sistema','reembolsos'), ('sistema','recupero'), ('sistema','costo_psp')
ON CONFLICT DO NOTHING;

-- Categorías (jerárquicas; una sensible)
INSERT INTO categoria (id, nombre, parent_id, nivel, sensible) VALUES
  ('a0000000-0000-0000-0000-000000000001','Hogar',        NULL, 1, false),
  ('a0000000-0000-0000-0000-000000000002','Aseo',         'a0000000-0000-0000-0000-000000000001', 2, false),
  ('a0000000-0000-0000-0000-000000000003','Gasfitería',   'a0000000-0000-0000-0000-000000000001', 2, false),
  ('a0000000-0000-0000-0000-000000000004','Jardinería',   'a0000000-0000-0000-0000-000000000001', 2, false),
  ('a0000000-0000-0000-0000-000000000005','Cuidado infantil', NULL, 1, true)
ON CONFLICT (id) DO NOTHING;

-- Usuarios de ejemplo (perfil dual) + NeatProfile
INSERT INTO usuario (id, email, password_hash) VALUES
  ('b0000000-0000-0000-0000-000000000001','cliente@demo.cl','x'),
  ('b0000000-0000-0000-0000-000000000002','pro@demo.cl','x')
ON CONFLICT (id) DO NOTHING;

INSERT INTO neatprofile (usuario_id, descripcion) VALUES
  ('b0000000-0000-0000-0000-000000000001','Cliente de demostración'),
  ('b0000000-0000-0000-0000-000000000002','Profesional de demostración')
ON CONFLICT (usuario_id) DO NOTHING;

SELECT 'seed OK' AS resultado;
