import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';

/**
 * Configuración compartida entre el bootstrap (main.ts) y los tests e2e,
 * para que ambos ejerciten exactamente la misma app.
 * - Prefijo /v1 (coincide con el server url del OpenAPI).
 * - ValidationPipe con whitelist (descarta props desconocidas) y 422 en error
 *   semántico (Unprocessable Entity), coherente con el contrato.
 */
export function configureApp(app: INestApplication): void {
  // CORS abierto para que el panel de pruebas (public/index.html) pueda llamar a la API
  // desde el navegador (file:// u otro origen). En producción, restringir a los orígenes reales.
  app.enableCors();
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );
}
