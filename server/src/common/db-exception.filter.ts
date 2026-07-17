import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

// Errores de la clase «data exception» de SQL (SQLSTATE 22xxx): uuid mal formado
// (22P02), valor fuera de rango numérico (22003), enum inválido, etc. Sin este filtro,
// un :id con formato inválido en la ruta (p.ej. /opportunities/abc) llega crudo a una
// columna uuid y Postgres/PGlite lanza 22P02 → 500 filtrando un error de BD. Aquí se
// traduce a un 400 limpio (es un error del cliente, no del servidor). Un uuid válido
// pero inexistente NO cae aquí: la query devuelve 0 filas y el handler lanza 404.
const DATA_EXCEPTION_MSG = /invalid input syntax|out of range|invalid input value for enum/i;
// Violación de integridad causada por el cliente (referencia inexistente, nulo, check):
// es un 422, no un 500. La unicidad (23505 / mensaje) es un 409.
const UNIQUE_MSG = /duplicate key|unique constraint|violates unique/i;
const INTEGRITY_MSG = /foreign key|not-null|violates check|violates not-null|invalid reference/i;

// SQLSTATE → HTTP para errores de BD que en realidad son culpa del cliente.
const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL',
  501: 'NOT_IMPLEMENTED',
};

/**
 * Filtro global de errores. Normaliza TODA respuesta de error al contrato `Error`
 * del OpenAPI: `{ code, message, details? }` (+ `statusCode` extra para el panel).
 * - `code` es el discriminador estable (CONFLICT, NOT_FOUND, …) que un cliente tipado
 *   espera; sin él, `error.code` sería undefined en tiempo de ejecución.
 * - `message` es SIEMPRE string (los mensajes de validación, que Nest emite como array,
 *   se resumen a string y el detalle se preserva en `details.errors`).
 * Además traduce errores de entrada de la BD (uuid/enum/rango/FK) a 4xx en vez de 500.
 */
@Catch()
export class DbExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('DbExceptionFilter');

  private send(
    res: Response,
    status: number,
    message: string,
    details?: Record<string, unknown>,
  ): void {
    const code = CODE_BY_STATUS[status] ?? `HTTP_${status}`;
    res.status(status).json({ code, message, ...(details ? { details } : {}), statusCode: status });
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    // Excepciones HTTP (validación 422, 404, guards 400/403, 409…): se re-emiten con la
    // forma del contrato Error, extrayendo un message string y preservando el detalle.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        this.send(res, status, body);
        return;
      }
      const b = body as { message?: string | string[]; error?: string };
      let message: string;
      let details: Record<string, unknown> | undefined;
      if (Array.isArray(b.message)) {
        // Errores de ValidationPipe: array de mensajes → resumen + detalle completo.
        message = b.message.join('; ');
        details = { errors: b.message };
      } else {
        message = b.message ?? b.error ?? 'error';
      }
      this.send(res, status, message, details);
      return;
    }

    const sqlstate = String((exception as { code?: string })?.code ?? '');
    const msg = String((exception as { message?: string })?.message ?? '');

    // Clase 22xxx (data exception): uuid/enum/rango con formato inválido → 400.
    if (sqlstate.startsWith('22') || DATA_EXCEPTION_MSG.test(msg)) {
      this.send(res, HttpStatus.BAD_REQUEST, 'parámetro con formato inválido');
      return;
    }
    // Unicidad (23505) → 409. Los handlers suelen capturarla antes; esto es un backstop.
    if (sqlstate === '23505' || UNIQUE_MSG.test(msg)) {
      this.send(res, HttpStatus.CONFLICT, 'recurso duplicado');
      return;
    }
    // Otras violaciones de integridad (23503 FK, 23502 not-null, 23514 check) → 422:
    // el cliente referenció/omitió algo inválido (p.ej. categoria_id inexistente).
    if (sqlstate.startsWith('23') || INTEGRITY_MSG.test(msg)) {
      this.send(res, HttpStatus.UNPROCESSABLE_ENTITY, 'referencia o dato inválido');
      return;
    }

    // Cualquier otro error es genuinamente interno: 500 sin filtrar detalles.
    this.logger.error(`Error no controlado: ${msg}`);
    this.send(res, HttpStatus.INTERNAL_SERVER_ERROR, 'error interno');
  }
}
