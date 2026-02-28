import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import type {
  CreateUserInput,
  UserRecord,
  UsersRepositoryPort,
} from '../../application/auth/ports/users-repository.port';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersRepository implements UsersRepositoryPort {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.usersRepository.findOne({ where: { email } });
    return user ? this.toRecord(user) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.usersRepository.findOne({ where: { id } });
    return user ? this.toRecord(user) : null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const user = await this.usersRepository.save(
      this.usersRepository.create({
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        refreshTokenHash: null,
      }),
    );
    return this.toRecord(user);
  }

  async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      {
        refreshTokenHash,
      },
    );
  }

  private toRecord(user: User): UserRecord {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      refreshTokenHash: user.refreshTokenHash,
    };
  }
}
