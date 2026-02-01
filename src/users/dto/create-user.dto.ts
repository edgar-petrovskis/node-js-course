import { Type } from 'class-transformer';
import { IsEmail, IsString, MinLength, IsInt, Min } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  age: number;
}
