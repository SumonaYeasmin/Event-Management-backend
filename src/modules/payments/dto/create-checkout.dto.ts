import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({
    example: 'd3b07384-d113-4a7b-8c88-1234567890ab',
    description: 'The unique ID of the event to purchase ticket for',
  })
  @IsNotEmpty()
  @IsString()
  eventId: string;
}
