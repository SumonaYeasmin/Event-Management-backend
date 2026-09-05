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

  // ৭. ইভেন্টে রেজিস্ট্রেশন / বুকিং করা (Protected)
  @Post(':id/register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register / Book a seat for an event (Requires Token)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Bad Request: No seats available' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 409, description: 'Conflict: Already registered' })
  register(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.eventsService.registerEvent(id, user.id);
  }

  // ৮. ইভেন্টের সমস্ত অ্যাটেন্ডি লিস্ট দেখা (Protected - Only Organizer)
  @Get(':id/attendees')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of attendees for an event (Only Event Organizer)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'List of attendees' })
  @ApiResponse({ status: 403, description: 'Forbidden: Not your event' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  getAttendees(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.eventsService.getEventAttendees(id, user.id);
  }

  // ৯. রেজিস্ট্রেশন বাতিল করা (Protected - Logged in User)
  @Delete(':id/register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel my registration for an event (Requires Token)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Registration cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Not registered for this event' })
  cancelRegistration(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.eventsService.cancelRegistration(id, user.id);
  }
}
