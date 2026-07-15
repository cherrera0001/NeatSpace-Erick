# Deploy local — NeatSpace

## Opción A · Stack completo con Docker (recomendado)

Requiere **Docker Desktop** (en Windows: instalar y dejar el daemon corriendo).
Un solo comando levanta PostgreSQL+PostGIS, aplica las migraciones, siembra datos
y arranca la API conectada a la BD:

```bash
docker compose up --build
```

Luego abre el **panel de pruebas** (doble clic, funciona con la API vía CORS):

```
public/index.html
```

Desde ahí puedes: ver `/health`, listar `/categories` (con filtros `level`/`parent`),
**registrar un usuario** y **hacer login** (muestra el JWT). O directo con curl/navegador:

- **Salud + conectividad BD:** http://localhost:3000/v1/health → `{"status":"ok","db":"up"}`
- **Categorías (datos reales sembrados):** http://localhost:3000/v1/categories
- **Registro (real):** `POST /v1/auth/register` `{nombre,email,password}` → crea Usuario+NeatProfile+NeatWallet (atómico) y devuelve JWT.
- **Login (real):** `POST /v1/auth/login` `{email,password}` → JWT (401 si credenciales inválidas).
- El resto de endpoints están mapeados; los que aún no tienen lógica responden `501`.

> Re-`up` seguro: el paso de migraciones se salta si el esquema ya existe, así que
> `docker compose up` es re-ejecutable sin `down -v`.

Parar y limpiar (incluido el volumen de datos):

```bash
docker compose down -v
```

> El job de CI **`stack`** (`.github/workflows/qa.yml`) ejecuta exactamente esto en
> cada push: levanta el stack y verifica `/v1/health` (200) y que `/v1/categories`
> trae los datos sembrados. Así queda validado aunque no tengas Docker local.

## Opción B · Solo la API (sin BD, para ver la forma)

No requiere Docker. Los endpoints con BD (`/health`, `/categories`) fallarán, pero
se ve el ruteo, la validación (422) y los guards (400/403):

```bash
cd server
npm install
npm run build
npm start           # http://localhost:3000/v1
```

## Referencia visual del contrato

```bash
npm run docs:api    # genera api-docs.html (Redoc, autocontenido) — ábrelo en el navegador
```

## Estado

| Pieza | Local sin Docker | Con Docker / CI |
|---|---|---|
| API (ruteo, validación, guards) | ✅ | ✅ |
| BD (PostgreSQL + PostGIS, migraciones, seed) | ❌ | ✅ |
| Slice real `/health` + `/categories` | ❌ (falla sin BD) | ✅ |
| Resto de handlers (lógica de negocio) | `501` (stub) | `501` (stub) |

El resto del ecosistema (flujos de dinero, reputación, matching) sigue en fase de
andamiaje: el contrato, el modelo de datos y los tests están; falta implementar la
lógica de cada handler sobre esta base.
