import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'password123', description: 'Current user password' })
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  oldPassword: string;

  @ApiProperty({ example: 'newPassword456', description: 'New replacement password (min 6 characters)' })
  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword: string;
}
