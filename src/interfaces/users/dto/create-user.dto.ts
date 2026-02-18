import { Type } from 'class-transformer';
import { IsEmail, IsString, MinLength, IsInt, Min } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'User name' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  age: number;
}
