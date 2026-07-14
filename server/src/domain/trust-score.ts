// Dominio del Trust Score (doc 05 §4). Media bayesiana: un novato arranca cerca
// del prior; el peso del evaluador está ACOTADO por un techo (anti-oligarquía).

/** Normaliza estrellas 1..5 → [0,1]. */
export function starToUnit(stars: number): number {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new RangeError(`estrellas inválidas (1..5): ${stars}`);
  }
  return (stars - 1) / 4;
}

export interface WeightedRating {
  s: number; // rating normalizado [0,1]
  w: number; // peso ω_i
}

/**
 * Trust Score 0..100 (bayesiano):
 *   round( 100 · (C·m̄ + Σ ω_i·s_i) / (C + Σ ω_i) )
 * Con n=0 devuelve ≈ round(100·m̄) (cold-start).
 */
export function bayesianScore(
  ratings: WeightedRating[],
  priorMean: number,
  priorStrength: number,
): number {
  const sumW = ratings.reduce((a, r) => a + r.w, 0);
  const sumWS = ratings.reduce((a, r) => a + r.w * r.s, 0);
  const denom = priorStrength + sumW;
  // Guarda: denominador 0 (sin prior ni ratings) → cae al prior, nunca NaN.
  const value = denom === 0 ? priorMean : (priorStrength * priorMean + sumWS) / denom;
  const score = Math.round(100 * value);
  // El score SIEMPRE queda en [0,100] aunque lleguen pesos fuera de rango.
  return Math.max(0, Math.min(100, score));
}

/** Techo del peso del evaluador (doc 05 §4.3): evita el bucle "el rico se hace más rico". */
export const EVALUATOR_WEIGHT_CAP = 3;

export function cappedEvaluatorWeight(rawWeight: number): number {
  return Math.min(Math.max(rawWeight, 0), EVALUATOR_WEIGHT_CAP);
}
