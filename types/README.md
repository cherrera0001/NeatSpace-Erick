# Tipos TypeScript del contrato

`openapi.ts` son los **tipos TypeScript generados desde `specs/openapi.yaml`** con
[`openapi-typescript`](https://github.com/openapi-ts/openapi-typescript). Son la
representación tipada del contrato REST — spec-driven: **no se editan a mano**.

## Regenerar

```bash
npm run gen:types    # openapi-typescript specs/openapi.yaml -o types/openapi.ts
```

## Uso

```ts
import type { paths, components } from "./types/openapi";

type Acuerdo   = components["schemas"]["Acuerdo"];
type WalletGet = paths["/wallet"]["get"]["responses"]["200"]["content"]["application/json"];
```

Combínalo con un cliente tipado (p. ej. `openapi-fetch`) para que las llamadas
respeten el contrato en tiempo de compilación.

## Sincronía garantizada

El job `types` de `.github/workflows/qa.yml` regenera este archivo y **falla si
difiere del commit** — así los tipos nunca se desalinean del spec. Los tipos de
eventos (AsyncAPI) pueden generarse más adelante con AsyncAPI Modelina.
