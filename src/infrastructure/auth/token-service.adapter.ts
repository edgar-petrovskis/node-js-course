import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AuthTokenPayload,
  TokenServicePort,
} from '../../application/auth/ports/token-service.port';

type JwtPayload = AuthTokenPayload & { exp: number };
type TokenKind = 'access' | 'refresh';

@Injectable()
export class TokenServiceAdapter implements TokenServicePort {
  constructor(private readonly configService: ConfigService) {}

  signAccess(payload: AuthTokenPayload): Promise<string> {
    return Promise.resolve(this.sign(payload, 'access'));
  }

  signRefresh(payload: AuthTokenPayload): Promise<string> {
    return Promise.resolve(this.sign(payload, 'refresh'));
  }

  verifyAccess(token: string): Promise<AuthTokenPayload> {
    return Promise.resolve(this.verify(token, 'access'));
  }

  verifyRefresh(token: string): Promise<AuthTokenPayload> {
    return Promise.resolve(this.verify(token, 'refresh'));
  }

  private sign(payload: AuthTokenPayload, kind: TokenKind): string {
    const expiresIn = this.getExpiresInSeconds(kind);
    const secret = this.getSecret(kind);
    const header = this.base64UrlEncode(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    );
    const body = this.base64UrlEncode(
      JSON.stringify({
        ...payload,
        exp: Math.floor(Date.now() / 1000) + expiresIn,
      }),
    );
    const signature = this.signPart(`${header}.${body}`, secret);
    return `${header}.${body}.${signature}`;
  }

  private verify(token: string, kind: TokenKind): AuthTokenPayload {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) throw new Error('Invalid token');

    const secret = this.getSecret(kind);
    const expectedSignature = this.signPart(`${header}.${body}`, secret);
    if (
      Buffer.byteLength(expectedSignature) !== Buffer.byteLength(signature) ||
      !timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
    ) {
      throw new Error('Invalid token');
    }

    const payload = JSON.parse(
      this.base64UrlDecode(body),
    ) as Partial<JwtPayload>;
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') {
      throw new Error('Invalid token');
    }
    if (payload.exp <= Math.floor(Date.now() / 1000))
      throw new Error('Token expired');
    return { sub: payload.sub, role: payload.role };
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

  private signPart(value: string, secret: string): string {
    return createHmac('sha256', secret).update(value).digest('base64url');
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
  }

  private base64UrlDecode(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
  }
}
