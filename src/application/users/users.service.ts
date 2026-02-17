import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreateUserDto } from '../../interfaces/users/dto/create-user.dto';
import { UpdateUserDto } from '../../interfaces/users/dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private configService: ConfigService) {}

  create(createUserDto: CreateUserDto) {
    return createUserDto;
    // return 'This action adds a new user';
  }

  findAll() {
    const port = this.configService.get<string>('port');
    const host = this.configService.get<string>('database.host');

    return `App is running on port: ${port}.\nThis action returns all users\nDatabase host: ${host}`;
  }

  findOne(id: string) {
    return `This action returns a #${id} user`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(id: string, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: string) {
    return `This action removes a #${id} user`;
  }
}
