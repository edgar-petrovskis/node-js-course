import { Role, UserId } from '../../../domain/users/role';

export type UserRecord = {
  id: UserId;
  email: string;
  passwordHash: string;
  role: Role;
  refreshTokenHash: string | null;
};

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  role: Role;
};

export interface UsersRepositoryPort {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: UserId): Promise<UserRecord | null>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  updateRefreshTokenHash(
    userId: UserId,
    refreshTokenHash: string | null,
  ): Promise<void>;
}
