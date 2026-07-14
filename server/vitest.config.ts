import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

// Vitest usa esbuild por defecto, que NO emite `emitDecoratorMetadata`. NestJS +
// class-validator dependen de esa metadata para validar los DTOs. Compilamos los
// tests con SWC (legacyDecorator + decoratorMetadata) para reproducir el runtime real.
export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2021',
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
