import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Bootstrap del stub. Los handlers están sin implementar (501) — este esqueleto
// deriva 1-a-1 del contrato specs/openapi.yaml y de los casos de uso (docs/06).
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1'); // coincide con el server url .../v1 del OpenAPI
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

void bootstrap();
