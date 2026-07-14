# Migraciones de base de datos — NeatSpace

Migraciones SQL **derivadas del `docs/08-MR.md`** (modelo relacional físico), listas para PostgreSQL 15+ con PostGIS. Son la traducción ejecutable del diseño: spec-driven de punta a punta (docs → `specs/` → MR → migraciones).

## Orden

Se aplican en orden numérico (dependencias entre tablas y funciones):

| # | Archivo | Contenido |
|---|---|---|
| 0001 | `extensions_and_functions.sql` | `postgis`, `pgcrypto`, `citext`; `num_nonnull`, `prevent_mutation` |
| 0002 | `enums.sql` | Todos los `CREATE TYPE ... AS ENUM` |
| 0003 | `identidad_catalogo.sql` | usuario, neatprofile, empresa, empresa_miembro, categoria |
| 0004 | `oportunidades_matching.sql` | oportunidad(+trigger tipo inmutable), postulacion, aceptacion_urgente, match_impression |
| 0005 | `sala_de_acuerdo.sql` | acuerdo, acuerdo_version, acuerdo_aceptacion, price_offer, mensaje, disputa |
| 0006 | `neatwallet.sql` | neatwallet(+XOR), pago, mercadopago_event, transaccion, ledger_entry(+balance diferido) |
| 0007 | `reputacion.sql` | evaluacion, reputation_log, trust_score |
| 0008 | `gobernanza_fiscal.sql` | admin_action, documento_tributario |
| 0009 | `indices.sql` | GiST geo, ranking, equidad, FKs |
| 0010 | `triggers.sql` | append-only + inmutabilidad de evaluacion |

## Cómo aplicar

**Con psql** (todas en orden):
```bash
for f in db/migrations/0*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

**Con Docker (PostGIS) para un entorno local o de test:**
```bash
docker run -d --name neat-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 postgis/postgis:15-3.4
export DATABASE_URL=postgres://postgres:dev@localhost:5432/postgres
for f in db/migrations/0*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

> En CI, este mismo bucle sobre un servicio `postgis/postgis` valida que el esquema levanta limpio y sirve de base para los tests de integración con **Testcontainers** (doc 10 §8).

## Reglas garantizadas por la base (no por la app)

- **Partida doble balanceada** (`tx_balance_chk`, diferido al commit): Σ débitos = Σ créditos, ≥2 asientos.
- **Identidad XOR de billetera** (`wallet_identidad_xor`): usuario **o** empresa **o** sistema.
- **Append-only** (`prevent_mutation`) en ledger, versiones, aceptaciones, ofertas, reputación, eventos MP, fiscal.
- **`oportunidad.tipo` inmutable**; **evaluacion** inmutable salvo `visible`/`comentario`.
- **Unicidad**: `UNIQUE(servicio, evaluador)`, `idempotency_key`, cuentas de sistema por rol.

## Estado de verificación

- ✅ **Sintaxis validada** con el parser real de PostgreSQL (`libpg_query`/`pglast`): las 10 migraciones parsean sin errores.
- ✅ **Ejecución en CI:** el job `migrate` de `.github/workflows/qa.yml` levanta un contenedor `postgis/postgis:15-3.4` y **aplica las migraciones en orden** (`ON_ERROR_STOP=1`) en cada push/PR — verificación real de que el esquema levanta (extensiones, FKs, triggers, constraints).
- ⚠️ **No se ejecutaron en la máquina de autoría** (sin Docker ni psql local). La primera corrida real ocurre en CI o al aplicarlas con el bucle de arriba.
