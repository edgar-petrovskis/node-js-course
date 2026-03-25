import type { Request } from 'express';

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { Role } from '../../domain/users/role';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const userRole = this.getUserRole(context);
    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new ForbiddenException('Forbidden resource');
    }

    return true;
  }

  private getUserRole(context: ExecutionContext): Role | undefined {
    if (context.getType<'http' | 'graphql'>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context).getContext<{
        user?: { role?: Role };
        req?: Request & { user?: { role?: Role } };
      }>();
      return gqlContext.user?.role ?? gqlContext.req?.user?.role;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { role?: Role } }>();
    return request.user?.role;
  }
}
