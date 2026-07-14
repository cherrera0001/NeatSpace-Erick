import { describe, it, expect } from 'vitest';
import { commission, net, splitResolution, COMMISSION_RATE } from './money';

describe('money — comisión (TC-U01)', () => {
  it('round(total × 0.20)', () => {
    expect(commission(10_000)).toBe(2_000);
    expect(commission(15_000)).toBe(3_000);
    expect(commission(999)).toBe(200); // 199.8 → 200
  });
  it('la tasa es 20%', () => expect(COMMISSION_RATE).toBe(0.2));
});

describe('money — neto complemento exacto (TC-U02)', () => {
  it('neto = total − comisión y suma exacta', () => {
    for (const total of [10_000, 15_000, 999, 1, 123_457]) {
      expect(net(total) + commission(total)).toBe(total); // sin descuadre de $1
    }
  });
});

describe('money — resolución dividida (TC-U03) y reembolso sin comisión (TC-U04)', () => {
  it('prof recibe 6.000 de 10.000', () => {
    const r = splitResolution(10_000, 6_000);
    expect(r).toEqual({ professionalNet: 4_800, commission: 1_200, refund: 4_000 });
    expect(r.professionalNet + r.commission + r.refund).toBe(10_000);
  });
  it('reembolso total → sin comisión', () => {
    const r = splitResolution(10_000, 0);
    expect(r.commission).toBe(0);
    expect(r.refund).toBe(10_000);
  });
  it('rechaza professionalGross > total', () => {
    expect(() => splitResolution(10_000, 12_000)).toThrow();
  });
});
