import { Global, Module } from '@nestjs/common';
import { DbService } from './db.service';

// Global: DbService disponible en cualquier módulo sin re-importar.
@Global()
@Module({
  providers: [DbService],
  exports: [DbService],
})
export class DbModule {}
