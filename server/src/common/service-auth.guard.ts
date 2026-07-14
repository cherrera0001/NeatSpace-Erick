import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Autorización de tráfico INTERNO (servicio-a-servicio). Los endpoints tagged
 * "Interno" en el OpenAPI (hold/release/refund, recompute) mueven dinero o
 * reputación y NO deben ser alcanzables con un JWT de usuario (heredaban el
 * bearerAuth global). Placeholder: exige un token de servicio en X-Internal-Token;
 * la verificación real (mTLS / scope de sistema / RBAC) va en la implementación.
 */
@Injectable()
export class ServiceAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.header('X-Internal-Token')) {
      throw new ForbiddenException(
        'Endpoint interno: requiere autenticación de servicio.',
      );
    }
    return true;
  }
}
