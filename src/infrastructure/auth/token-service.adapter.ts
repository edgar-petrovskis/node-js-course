import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import {
  AuthTokenPayload,
  TokenServicePort,
} from '../../application/auth/ports/token-service.port';

type TokenKind = 'access' | 'refresh';

@Injectable()
export class TokenServiceAdapter implements TokenServicePort {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccess(payload: AuthTokenPayload): Promise<string> {
    return this.sign(payload, 'access');
  }

  signRefresh(payload: AuthTokenPayload): Promise<string> {
    return this.sign(payload, 'refresh');
  }

  verifyAccess(token: string): Promise<AuthTokenPayload> {
    return this.verify(token, 'access');
  }

  verifyRefresh(token: string): Promise<AuthTokenPayload> {
    return this.verify(token, 'refresh');
  }

  private sign(payload: AuthTokenPayload, kind: TokenKind): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.getSecret(kind),
      expiresIn: this.getExpiresInSeconds(kind),
      algorithm: 'HS256',
    });
  }

  private async verify(
    token: string,
    kind: TokenKind,
  ): Promise<AuthTokenPayload> {
    const payload = await this.jwtService.verifyAsync<
      Partial<AuthTokenPayload> & { sub?: unknown; role?: unknown }
    >(token, {
      secret: this.getSecret(kind),
      algorithms: ['HS256'],
    });

    if (typeof payload.sub !== 'string') {
      throw new Error('Invalid token payload');
    }

    if (payload.role !== undefined && typeof payload.role !== 'string') {
      throw new Error('Invalid token payload');
    }

    return {
      sub: payload.sub,
      role: payload.role,
    };
  }

  private getSecret(kind: TokenKind): string {
    return this.configService.getOrThrow<string>(
      kind === 'access' ? 'jwt.secret' : 'jwt.refreshSecret',
    );
  }

  private getExpiresInSeconds(kind: TokenKind): number {
    const value =
      this.configService.get<string>(
        kind === 'access' ? 'jwt.accessTtl' : 'jwt.refreshTtl',
      ) ?? (kind === 'access' ? '15m' : '7d');
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error('Invalid JWT TTL format');
    const amount = Number(match[1]);
    const unit = match[2];
    const multiplier =
      unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
    return amount * multiplier;
  }
}
