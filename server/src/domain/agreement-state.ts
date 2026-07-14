// Máquina de estados del Acuerdo (doc 07 §4, doc 03 §3). Transiciones válidas.

export type AgreementState =
  | 'ABIERTA'
  | 'PROPUESTA'
  | 'PAGO_FALLIDO'
  | 'ACORDADO'
  | 'EN_EJECUCION'
  | 'ENTREGADO'
  | 'EN_DISPUTA'
  | 'CERRADO'
  | 'CANCELADO'
  | 'EXPIRADO';

const TRANSITIONS: Record<AgreementState, AgreementState[]> = {
  ABIERTA: ['PROPUESTA', 'CANCELADO', 'EXPIRADO'],
  PROPUESTA: ['ACORDADO', 'PAGO_FALLIDO', 'CANCELADO', 'EXPIRADO'],
  PAGO_FALLIDO: ['PROPUESTA', 'CANCELADO'],
  ACORDADO: ['EN_EJECUCION', 'CANCELADO'],
  EN_EJECUCION: ['ENTREGADO', 'EN_DISPUTA', 'CANCELADO'],
  ENTREGADO: ['CERRADO', 'EN_DISPUTA'],
  EN_DISPUTA: ['CERRADO', 'CANCELADO'],
  CERRADO: [], // terminal
  CANCELADO: [], // terminal
  EXPIRADO: [], // terminal
};

export function canTransition(from: AgreementState, to: AgreementState): boolean {
  const row = TRANSITIONS[from];
  return row ? row.includes(to) : false; // estado desconocido → false, no TypeError
}

export function isTerminal(state: AgreementState): boolean {
  const row = TRANSITIONS[state];
  return row ? row.length === 0 : false;
}
