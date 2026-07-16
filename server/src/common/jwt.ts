import * as jwt from 'jsonwebtoken';
import type { Request } from 'express';

/** Secret del JWT; fail-fast en producción si falta (sin fallback silencioso). */
export function resolveJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET es obligatorio en producción (sin fallback inseguro).');
  }
  // eslint-disable-next-line no-console
  console.warn('[NeatSpace] JWT_SECRET no definido — usando un secret de desarrollo INSEGURO.');
  return 'dev-only-insecure-secret';
}

/** Usuarios demo sembrados (fallback para usar la app sin login en la maqueta). */
export const DEMO_CLIENTE = 'b0000000-0000-4000-8000-000000000001';
export const DEMO_PROFESIONAL = 'b0000000-0000-4000-8000-000000000002';

/** usuario_id del token Bearer, o null si no hay/no es válido. */
export function currentUserId(req: Request): string | null {
  const h = req.header('authorization') ?? '';
  const m = /^Bearer (.+)$/i.exec(h);
  if (!m) return null;
  try {
    const payload = jwt.verify(m[1], resolveJwtSecret()) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
