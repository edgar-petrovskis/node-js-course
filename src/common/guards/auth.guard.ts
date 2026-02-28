import type { Request } from 'express';

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { AuthService } from '../../application/auth/auth.service';
import { UserRecord } from '../../application/auth/ports/users-repository.port';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = this.getRequest(context);
    const token = this.extractBearerToken(request.headers.authorization);
    const user = await this.authService.findUserByAccessToken(token);
    if (!user) throw new UnauthorizedException('Unauthorized');
    this.attachUser(context, request, user);
    return true;
  }

  private getRequest(
    context: ExecutionContext,
  ): Request & { user?: UserRecord } {
    if (context.getType<'http' | 'graphql'>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context).getContext<{
        req?: Request & { user?: UserRecord };
      }>();
      if (!gqlContext.req) throw new UnauthorizedException('Unauthorized');
      return gqlContext.req;
    }

    return context.switchToHttp().getRequest<Request & { user?: UserRecord }>();
  }

  private attachUser(
    context: ExecutionContext,
    request: Request & { user?: UserRecord },
    user: UserRecord,
  ): void {
    request.user = user;
    if (context.getType<'http' | 'graphql'>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context).getContext<{
        user?: UserRecord;
      }>();
      gqlContext.user = user;
    }
  }

  private extractBearerToken(authorization?: string): string {
    if (!authorization) throw new UnauthorizedException('Unauthorized');
    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Unauthorized');
    }
    return token;
  }
}
