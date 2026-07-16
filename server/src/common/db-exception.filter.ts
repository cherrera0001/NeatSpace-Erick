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

@Catch()
export class DbExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('DbExceptionFilter');

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
    if (code.startsWith('22') || DATA_EXCEPTION_MSG.test(msg)) {
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'parámetro con formato inválido',
      });
      return;
    }

    // Cualquier otro error es genuinamente interno: 500 sin filtrar detalles.
    this.logger.error(`Error no controlado: ${msg}`);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'error interno',
    });
  }
}
