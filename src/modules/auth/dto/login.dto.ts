import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'User registered email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User account password' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
