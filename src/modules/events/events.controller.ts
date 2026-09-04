import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { EventsService } from './events.service.js';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // 1. নতুন ইভেন্ট তৈরি (Protected)
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event (Requires Token)' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  create(@Req() req: Request, @Body() dto: CreateEventDto) {
    const user = (req as any).user;
    return this.eventsService.create(user.id, dto);
  }

    // 3. অর্গানাইজারের নিজের ইভেন্টগুলোর লিস্ট (Protected)
  @Get('my-events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all events created by logged-in user' })
  findMyEvents(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.eventsService.findMyEvents(user.id);
  }
}
