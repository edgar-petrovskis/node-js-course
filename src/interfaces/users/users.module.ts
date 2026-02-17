import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { UsersService } from '../../application/users/users.service';

import { UsersController } from './users.controller';

@Module({
  imports: [ConfigModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
