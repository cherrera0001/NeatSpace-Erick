import { BadRequestException } from '@nestjs/common';

/**
 * Rechaza caracteres de control (0x00-0x1F) en texto libre. PostgreSQL/PGlite no
 * admiten NUL (0x00) en columnas `text`: sin este guardia, el INSERT explota como
 * 500 en vez de un 4xx limpio. Se usa en todo input que llega a una columna text
 * (nombre de perfil, zona/descripcion de oportunidad, …).
 */
export function assertNoControlChars(s: string | null | undefined, campo = 'campo'): void {
  if (s == null) return;
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) < 0x20) {
      throw new BadRequestException(`${campo} contiene caracteres de control invalidos`);
    }
  }
}

/**
 * Tope superior para montos/precios enteros en CLP. `@IsInt` admite floats
 * enteros como 1e30 (Number.isInteger(1e30) === true); sin `@Max` ese valor
 * desborda la columna BIGINT y produce un 500. 100.000.000 CLP es un techo
 * holgado para un topup/precio de servicio y queda muy por debajo de int8.
 */
export const MONTO_MAX = 100_000_000;
