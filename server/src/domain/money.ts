// Dominio del dinero (doc 04). Funciones puras — la comisión se calcula SIEMPRE
// server-side (RN-2) y el neto es el complemento exacto (IN-2, sin descuadre).

export const COMMISSION_RATE = 0.2; // 20% NeatSpace

/** Comisión de NeatSpace sobre un total. RN-2. */
export function commission(total: number): number {
  assertNonNegativeInt(total);
  return Math.round(total * COMMISSION_RATE);
}

/** Neto del profesional = total − comisión (complemento exacto, nunca round(total*0.8)). */
export function net(total: number): number {
  return total - commission(total);
}

export interface SplitResult {
  professionalNet: number;
  commission: number;
  refund: number;
}

/**
 * Resolución dividida (doc 04 §5.5): el profesional recibe `professionalGross`
 * (bruto), sobre el que se aplica comisión; el resto se reembolsa SIN comisión.
 * Invariante: professionalNet + commission + refund === total.
 */
export function splitResolution(total: number, professionalGross: number): SplitResult {
  assertNonNegativeInt(total);
  assertNonNegativeInt(professionalGross);
  if (professionalGross > total) {
    throw new RangeError('professionalGross no puede superar el total');
  }
  const c = Math.round(professionalGross * COMMISSION_RATE);
  return {
    professionalNet: professionalGross - c,
    commission: c,
    refund: total - professionalGross, // reembolso sin comisión (RN-2)
  };
}

function assertNonNegativeInt(n: number): void {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`monto inválido (entero >= 0 en CLP): ${n}`);
  }
}
