import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DbService } from './db/db.service';

// Slice vertical mínimo: prueba de vida de la app + conectividad real a la BD.
@Controller('health')
export class HealthController {
  constructor(private readonly db: DbService) {}

  @Get()
  async health(): Promise<{ status: string; db: string }> {
    try {
      await this.db.query('SELECT 1');
      return { status: 'ok', db: 'up' };
    } catch {
      throw new ServiceUnavailableException({ status: 'degraded', db: 'down' });
    }
  }
}
