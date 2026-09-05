import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'User name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Full name' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiPropertyOptional({ example: 'password123', description: 'Password' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiPropertyOptional({ example: 'password123', description: 'Confirm password' })
  @IsOptional()
  @IsString()
  confirmPassword?: string;

  @ApiPropertyOptional({ example: 'USER', description: 'Role (USER, ORGANIZER, ADMIN)' })
  @IsOptional()
  @IsString()
  role?: any;
}

