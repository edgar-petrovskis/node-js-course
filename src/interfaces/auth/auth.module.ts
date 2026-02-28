import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from '../../application/auth/auth.service';
import { PasswordHasherAdapter } from '../../infrastructure/auth/password-hasher.adapter';
import { TokenServiceAdapter } from '../../infrastructure/auth/token-service.adapter';
import { User } from '../../infrastructure/entities/user.entity';
import { UsersRepository } from '../../infrastructure/repositories/users.repository';

import { AuthController } from './auth.controller';

export const USERS_REPOSITORY_PORT = Symbol('USERS_REPOSITORY_PORT');
export const PASSWORD_HASHER_PORT = Symbol('PASSWORD_HASHER_PORT');
export const TOKEN_SERVICE_PORT = Symbol('TOKEN_SERVICE_PORT');

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [
    UsersRepository,
    PasswordHasherAdapter,
    TokenServiceAdapter,
    { provide: USERS_REPOSITORY_PORT, useExisting: UsersRepository },
    { provide: PASSWORD_HASHER_PORT, useExisting: PasswordHasherAdapter },
    { provide: TOKEN_SERVICE_PORT, useExisting: TokenServiceAdapter },
    {
      provide: AuthService,
      useFactory: (
        usersRepository: AuthServiceConstructorParameters[0],
        passwordHasher: AuthServiceConstructorParameters[1],
        tokenService: AuthServiceConstructorParameters[2],
      ) => new AuthService(usersRepository, passwordHasher, tokenService),
      inject: [USERS_REPOSITORY_PORT, PASSWORD_HASHER_PORT, TOKEN_SERVICE_PORT],
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}

type AuthServiceConstructorParameters = ConstructorParameters<
  typeof AuthService
>;
