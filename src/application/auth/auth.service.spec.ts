import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from '../../domain/auth/auth.errors';
import { Role } from '../../domain/users/role';

import { AuthService } from './auth.service';
import { PasswordHasherPort } from './ports/password-hasher.port';
import { TokenServicePort } from './ports/token-service.port';
import { UsersRepositoryPort } from './ports/users-repository.port';

const user = {
  id: 'u1',
  email: 'user@mail.com',
  passwordHash: 'pwd-hash',
  role: Role.USER,
  refreshTokenHash: 'refresh-hash',
};

const makeSut = () => {
  const usersRepository: jest.Mocked<UsersRepositoryPort> = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    createUser: jest.fn(),
    updateRefreshTokenHash: jest.fn(),
  };
  const passwordHasher: jest.Mocked<PasswordHasherPort> = {
    hash: jest.fn(),
    verify: jest.fn(),
  };
  const tokenService: jest.Mocked<TokenServicePort> = {
    signAccess: jest.fn(),
    signRefresh: jest.fn(),
    verifyAccess: jest.fn(),
    verifyRefresh: jest.fn(),
  };
  return {
    service: new AuthService(usersRepository, passwordHasher, tokenService),
    usersRepository,
    passwordHasher,
    tokenService,
  };
};

describe('AuthService', () => {
  it('register creates user and returns tokens', async () => {
    const { service, usersRepository, passwordHasher, tokenService } =
      makeSut();
    usersRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash
      .mockResolvedValueOnce('pwd-hash')
      .mockResolvedValueOnce('refresh-hash');
    usersRepository.createUser.mockResolvedValue(user);
    tokenService.signAccess.mockResolvedValue('access');
    tokenService.signRefresh.mockResolvedValue('refresh');

    await expect(service.register('user@mail.com', 'pwd')).resolves.toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    expect(usersRepository.createUser.mock.calls[0][0]).toEqual({
      email: 'user@mail.com',
      passwordHash: 'pwd-hash',
      role: Role.USER,
    });
    expect(usersRepository.updateRefreshTokenHash.mock.calls[0]).toEqual([
      'u1',
      'refresh-hash',
    ]);
  });

  it('register throws when email already exists', async () => {
    const { service, usersRepository } = makeSut();
    usersRepository.findByEmail.mockResolvedValue(user);
    await expect(service.register('user@mail.com', 'pwd')).rejects.toThrow(
      EmailAlreadyExistsError,
    );
  });

  it('login throws for invalid credentials', async () => {
    const { service, usersRepository, passwordHasher } = makeSut();
    usersRepository.findByEmail.mockResolvedValue(user);
    passwordHasher.verify.mockResolvedValue(false);
    await expect(service.login('user@mail.com', 'wrong')).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('refresh returns new access token for valid refresh token', async () => {
    const { service, usersRepository, passwordHasher, tokenService } =
      makeSut();
    tokenService.verifyRefresh.mockResolvedValue({
      sub: 'u1',
      role: Role.USER,
    });
    usersRepository.findById.mockResolvedValue(user);
    passwordHasher.verify.mockResolvedValue(true);
    tokenService.signAccess.mockResolvedValue('new-access');

    await expect(service.refresh('refresh')).resolves.toEqual({
      accessToken: 'new-access',
    });
  });

  it('refresh throws for invalid refresh token', async () => {
    const { service, tokenService, usersRepository } = makeSut();
    tokenService.verifyRefresh.mockResolvedValue({
      sub: 'u1',
      role: Role.USER,
    });
    usersRepository.findById.mockResolvedValue({
      ...user,
      refreshTokenHash: null,
    });
    await expect(service.refresh('refresh')).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });

  it('logout clears refresh token hash', async () => {
    const { service, tokenService, usersRepository } = makeSut();
    tokenService.verifyRefresh.mockResolvedValue({
      sub: 'u1',
      role: Role.USER,
    });
    await expect(service.logout('refresh')).resolves.toEqual({ ok: true });
    expect(usersRepository.updateRefreshTokenHash.mock.calls[0]).toEqual([
      'u1',
      null,
    ]);
  });
});
