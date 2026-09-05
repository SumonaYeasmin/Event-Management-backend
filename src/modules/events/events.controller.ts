import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { QueryEventDto } from './dto/query-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
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
  // ২. সমস্ত পাবলিক ইভেন্ট দেখা (Search, Filter, Pagination সহ - Public)
  @Get()
  @ApiOperation({ summary: 'Get all published events with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'List of events' })
  findAll(@Query() query: QueryEventDto) {
    return this.eventsService.findAll(query);
  }
  // ৩. অর্গানাইজারের নিজের ইভেন্টগুলোর লিস্ট (Protected)
  // (নোট: :id রাউটের আগে my-events থাকতে হবে যেন কনফ্লিক্ট না করে)
  @Get('my-events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all events created by logged-in user' })
  @ApiResponse({ status: 200, description: 'Organizer events list' })
  findMyEvents(@Req() req: Request) {
    const user = (req as any).user;
    return this.eventsService.findMyEvents(user.id);
  }
  // ৪. নির্দিষ্ট একটি ইভেন্ট দেখা (Public)
  @Get(':id')
  @ApiOperation({ summary: 'Get event details by ID' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event details' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }
  // ৫. ইভেন্ট আপডেট করা (Protected - Only Organizer)
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an event (Only the organizer can update)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Not your event' })
  update(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: UpdateEventDto,
  ) {
    const user = (req as any).user;
    return this.eventsService.update(id, user.id, dto);
  }
  // ৬. ইভেন্ট ডিলিট করা (Protected - Only Organizer)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an event (Only the organizer can delete)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Not your event' })
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.eventsService.remove(id, user.id);
  }
}
