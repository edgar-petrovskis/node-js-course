import { Role, UserId } from '../../../domain/users/role';

export type AuthTokenPayload = {
  sub: UserId;
  role?: Role;
};

export interface TokenServicePort {
  signAccess(payload: AuthTokenPayload): Promise<string>;
  signRefresh(payload: AuthTokenPayload): Promise<string>;
  verifyAccess(token: string): Promise<AuthTokenPayload>;
  verifyRefresh(token: string): Promise<AuthTokenPayload>;
}
