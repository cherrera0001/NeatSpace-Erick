import { describe, it, expect } from 'vitest';
import {
  bayesianScore,
  starToUnit,
  cappedEvaluatorWeight,
  EVALUATOR_WEIGHT_CAP,
} from './trust-score';

const M = 0.6; // media global (prior)
const C = 10; // fuerza del prior

describe('trust-score — bayesiano evita 100/100 con 1 reseña (TC-U05)', () => {
  it('una reseña de 5★ no da 100', () => {
    const score = bayesianScore([{ s: starToUnit(5), w: 1 }], M, C);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(Math.round(100 * M)); // sube respecto al prior
  });
});

describe('trust-score — cold start (TC-U06)', () => {
  it('n=0 ≈ round(100·m̄)', () => {
    expect(bayesianScore([], M, C)).toBe(Math.round(100 * M)); // 60
  });
});

describe('trust-score — techo de ω_evaluador (TC-U07)', () => {
  it('un peso alto se acota al techo', () => {
    expect(cappedEvaluatorWeight(100)).toBe(EVALUATOR_WEIGHT_CAP);
    expect(cappedEvaluatorWeight(-5)).toBe(0);
    expect(cappedEvaluatorWeight(2)).toBe(2);
  });
});

describe('trust-score — normalización de estrellas', () => {
  it('1→0, 3→0.5, 5→1', () => {
    expect(starToUnit(1)).toBe(0);
    expect(starToUnit(3)).toBe(0.5);
    expect(starToUnit(5)).toBe(1);
    expect(() => starToUnit(0)).toThrow();
  });
});
