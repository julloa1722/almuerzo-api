import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Requiere que corra DESPUÉS de JwtAuthGuard (que llena req.ambito).
 * Si el endpoint no tiene @Roles(), no exige ningún rol en particular —
 * solo exige estar autenticado, que ya garantizó JwtAuthGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rolesRequeridos || rolesRequeridos.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    if (!req.ambito) {
      throw new ForbiddenException('Esta acción requiere haber seleccionado un ámbito (empresa/suplidor/plataforma).');
    }
    if (!rolesRequeridos.includes(req.ambito.rol)) {
      throw new ForbiddenException(`Rol insuficiente. Se requiere uno de: ${rolesRequeridos.join(', ')}.`);
    }
    return true;
  }
}
