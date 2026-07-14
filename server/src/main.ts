import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.config';

// Bootstrap del stub. Los handlers están sin implementar (501) — este esqueleto
// deriva 1-a-1 del contrato specs/openapi.yaml y de los casos de uso (docs/06).
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

void bootstrap();
