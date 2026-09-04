

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EventType } from '../../../generated/prisma/enums.js';

export class CreateEventDto {
  @ApiProperty({
    example: 'Innovate 2026 — The Future of Technology',
    description: 'Title of the event',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Join industry leaders for an immersive conference on emerging tech.',
    description: 'Detailed description of the event',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
    description: 'Banner image URL',
  })
  @IsOptional()
  @IsString()
  bannerImage?: string;

  @ApiProperty({
    example: '2026-08-22T10:00:00.000Z',
    description: 'Event start date and time (ISO 8601 string)',
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    example: '2026-08-22T18:00:00.000Z',
    description: 'Event end date and time',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    example: 'Metro Convention Center, Hall A',
    description: 'Physical location or online meeting link',
  })
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({
    example: 'Technology',
    description: 'Category (Technology, Music, Business, etc.)',
  })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiPropertyOptional({
    enum: ['IN_PERSON', 'ONLINE'],
    default: 'IN_PERSON',
    description: 'Event type: IN_PERSON or ONLINE',
  })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiPropertyOptional({
    example: 49.99,
    default: 0.0,
    description: 'Ticket price (0 for free)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ticketPrice?: number;

  @ApiProperty({
    example: 500,
    description: 'Total number of seats',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  totalSeats: number;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Set to true to show in Featured events on homepage',
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
