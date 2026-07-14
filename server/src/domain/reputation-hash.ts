// Cadena de hash del ReputationLog (doc 05 §3, IN-8): append-only encadenado.
// Alterar un evento pasado rompe la cadena y es detectable en auditoría.
import { createHash } from 'node:crypto';

/** hash_actual = SHA256(hash_prev ‖ payload). */
export function hashEvent(hashPrev: string | null, payload: string): string {
  return createHash('sha256')
    .update((hashPrev ?? '') + payload)
    .digest('hex');
}

export interface LogEntry {
  payload: string;
  hashPrev: string | null;
  hashActual: string;
}

/** Construye la cadena a partir de una secuencia de payloads. */
export function buildChain(payloads: string[]): LogEntry[] {
  const chain: LogEntry[] = [];
  let prev: string | null = null;
  for (const payload of payloads) {
    const hashActual = hashEvent(prev, payload);
    chain.push({ payload, hashPrev: prev, hashActual });
    prev = hashActual;
  }
  return chain;
}

/** Verifica la integridad recomputando cada eslabón (auditoría). */
export function verifyChain(entries: LogEntry[]): boolean {
  let prev: string | null = null;
  for (const e of entries) {
    if (e.hashPrev !== prev) return false;
    if (e.hashActual !== hashEvent(e.hashPrev, e.payload)) return false;
    prev = e.hashActual;
  }
  return true;
}
