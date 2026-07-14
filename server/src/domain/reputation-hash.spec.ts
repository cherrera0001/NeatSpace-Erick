import { describe, it, expect } from 'vitest';
import { buildChain, verifyChain, hashEvent } from './reputation-hash';

describe('reputation-hash — cadena encadenada (TC-U08 / IN-8)', () => {
  const payloads = ['evaluacion:5', 'sancion:leve', 'apelacion:ok'];

  it('recomputa reproduce la cadena', () => {
    const chain = buildChain(payloads);
    expect(verifyChain(chain)).toBe(true);
    expect(chain[0].hashPrev).toBeNull();
    expect(chain[1].hashPrev).toBe(chain[0].hashActual);
  });

  it('alterar un payload pasado rompe la cadena (detectable)', () => {
    const chain = buildChain(payloads);
    const tampered = chain.map((e, i) =>
      i === 0 ? { ...e, payload: 'evaluacion:1' } : e,
    );
    expect(verifyChain(tampered)).toBe(false);
  });

  it('determinista', () => {
    expect(hashEvent(null, 'x')).toBe(hashEvent(null, 'x'));
    expect(hashEvent(null, 'x')).not.toBe(hashEvent(null, 'y'));
  });
});
