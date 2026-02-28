import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from '../../domain/auth/auth.errors';
import { Role, UserId } from '../../domain/users/role';

import { PasswordHasherPort } from './ports/password-hasher.port';
import { TokenServicePort } from './ports/token-service.port';
import { UserRecord, UsersRepositoryPort } from './ports/users-repository.port';

export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenService: TokenServicePort,
  ) {}
  async register(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) throw new EmailAlreadyExistsError();

    const passwordHash = await this.passwordHasher.hash(password);
    const createdUser = await this.usersRepository.createUser({
      email,
      passwordHash,
      role: Role.USER,
    });

    return this.issueTokens(createdUser.id, createdUser.role);
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) throw new InvalidCredentialsError();

    const isValidPassword = await this.passwordHasher.verify(
      password,
      user.passwordHash,
    );

    if (!isValidPassword) throw new InvalidCredentialsError();

    return this.issueTokens(user.id, user.role);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const payload = await this.tokenService.verifyRefresh(refreshToken);
    const user = await this.usersRepository.findById(payload.sub);

    if (!user || !user.refreshTokenHash) throw new InvalidRefreshTokenError();

    const isValidRefresh = await this.passwordHasher.verify(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!isValidRefresh) throw new InvalidRefreshTokenError();

    const accessToken = await this.tokenService.signAccess({
      sub: user.id,
      role: user.role,
    });

    return { accessToken };
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    const payload = await this.tokenService.verifyRefresh(refreshToken);
    await this.usersRepository.updateRefreshTokenHash(payload.sub, null);

    return { ok: true };
  }

  async findUserByAccessToken(accessToken: string): Promise<UserRecord | null> {
    try {
      const payload = await this.tokenService.verifyAccess(accessToken);
      return this.usersRepository.findById(payload.sub);
    } catch {
      return null;
    }
  }

  private async issueTokens(
    userId: UserId,
    role: Role,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccess(payload),
      this.tokenService.signRefresh(payload),
    ]);
    const refreshTokenHash = await this.passwordHasher.hash(refreshToken);

    await this.usersRepository.updateRefreshTokenHash(userId, refreshTokenHash);

    return { accessToken, refreshToken };
  }
}
