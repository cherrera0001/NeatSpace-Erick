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

@Catch()
export class DbExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('DbExceptionFilter');

  private send(res: Response, status: number, error: string, message: string): void {
    res.status(status).json({ statusCode: status, error, message });
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    // Las excepciones HTTP (validación 422, 404, guards 400/403, 409…) pasan intactas.
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      res
        .status(exception.getStatus())
        .json(typeof body === 'string' ? { statusCode: exception.getStatus(), message: body } : body);
      return;
    }

    const code = String((exception as { code?: string })?.code ?? '');
    const msg = String((exception as { message?: string })?.message ?? '');

    // Clase 22xxx (data exception): uuid/enum/rango con formato inválido → 400.
    if (code.startsWith('22') || DATA_EXCEPTION_MSG.test(msg)) {
      this.send(res, HttpStatus.BAD_REQUEST, 'Bad Request', 'parámetro con formato inválido');
      return;
    }
    // Unicidad (23505) → 409. Los handlers suelen capturarla antes; esto es un backstop.
    if (code === '23505' || UNIQUE_MSG.test(msg)) {
      this.send(res, HttpStatus.CONFLICT, 'Conflict', 'recurso duplicado');
      return;
    }
    // Otras violaciones de integridad (23503 FK, 23502 not-null, 23514 check) → 422:
    // el cliente referenció/omitió algo inválido (p.ej. categoria_id inexistente).
    if (code.startsWith('23') || INTEGRITY_MSG.test(msg)) {
      this.send(res, HttpStatus.UNPROCESSABLE_ENTITY, 'Unprocessable Entity', 'referencia o dato inválido');
      return;
    }

    // Cualquier otro error es genuinamente interno: 500 sin filtrar detalles.
    this.logger.error(`Error no controlado: ${msg}`);
    this.send(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error', 'error interno');
  }
}
