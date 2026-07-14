import { describe, it, expect } from 'vitest';
import { canTransition, isTerminal, type AgreementState } from './agreement-state';

describe('agreement-state — transiciones (TC-U09)', () => {
  it('transiciones válidas', () => {
    expect(canTransition('ACORDADO', 'EN_EJECUCION')).toBe(true);
    expect(canTransition('EN_EJECUCION', 'ENTREGADO')).toBe(true);
    expect(canTransition('ENTREGADO', 'CERRADO')).toBe(true);
    expect(canTransition('PROPUESTA', 'PAGO_FALLIDO')).toBe(true);
  });

  it('transiciones inválidas rechazadas', () => {
    expect(canTransition('ACORDADO', 'ENTREGADO')).toBe(false); // pasa por EN_EJECUCION
    expect(canTransition('PROPUESTA', 'CERRADO')).toBe(false);
    expect(canTransition('CERRADO', 'ABIERTA')).toBe(false); // terminal
  });

  it('estados terminales', () => {
    expect(isTerminal('CERRADO')).toBe(true);
    expect(isTerminal('CANCELADO')).toBe(true);
    expect(isTerminal('EXPIRADO')).toBe(true);
    expect(isTerminal('ACORDADO')).toBe(false);
  });

  it('estado desconocido no lanza (retorna false)', () => {
    const bogus = 'FOO' as unknown as AgreementState;
    expect(canTransition(bogus, 'CERRADO')).toBe(false);
    expect(() => isTerminal(bogus)).not.toThrow();
    expect(isTerminal(bogus)).toBe(false);
  });
});
