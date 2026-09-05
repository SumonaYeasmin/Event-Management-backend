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
import { Roles } from '../../decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { RolesGuard } from '../../guards/roles.guard.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { QueryEventDto } from './dto/query-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { EventsService } from './events.service.js';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ১. নতুন ইভেন্ট তৈরি (Protected - Only Organizer & Admin)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event (Requires ORGANIZER or ADMIN role)' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ORGANIZER or ADMIN role' })
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

  // ৩. অর্গানাইজারের নিজের তৈরি ইভেন্টগুলোর লিস্ট (Protected - Organizer & Admin)
  // (নোট: :id রাউটের আগে my-events থাকতে হবে যেন কনফ্লিক্ট না করে)
  @Get('my-events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all events created by logged-in organizer' })
  @ApiResponse({ status: 200, description: 'Organizer events list' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ORGANIZER or ADMIN role' })
  findMyEvents(@Req() req: Request) {
    const user = (req as any).user;
    return this.eventsService.findMyEvents(user.id);
  }

  // ১০.৩ ইউজারের নিজের সেভ করা সমস্ত ইভেন্ট দেখা (Protected - Any Logged in User)
  // (নোট: :id রাউটের আগে my-favorites থাকতে হবে যেন কনফ্লিক্ট না করে)
  @Get('my-favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all saved / favorite events of logged-in user' })
  @ApiResponse({ status: 200, description: 'User favorite events list' })
  getMyFavorites(@Req() req: Request) {
    const user = (req as any).user;
    return this.eventsService.getMyFavorites(user.id);
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

  // ৫. ইভেন্ট আপডেট করা (Protected - Only Event Organizer & Admin)
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an event (Only the organizer or admin can update)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Not authorized' })
  update(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: UpdateEventDto,
  ) {
    const user = (req as any).user;
    return this.eventsService.update(id, user.id, dto);
  }

  // ৬. ইভেন্ট ডিলিট করা (Protected - Only Event Organizer & Admin)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an event (Only the organizer or admin can delete)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Not authorized' })
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.eventsService.remove(id, user.id);
  }

  // ৭. ইভেন্টে রেজিস্ট্রেশন / বুকিং করা (Protected - All Roles)
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

  // ৮. ইভেন্টের সমস্ত অ্যাটেন্ডি লিস্ট দেখা (Protected - Only Event Organizer & Admin)
  @Get(':id/attendees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of attendees for an event (Only Event Organizer / Admin)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'List of attendees' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ORGANIZER or ADMIN role' })
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

  // ১০.১ ইভেন্ট ফেভারিট / সেভ করা (Protected - All Roles)
  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add event to favorites / bookmarks' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 201, description: 'Event saved to favorites' })
  @ApiResponse({ status: 409, description: 'Already in favorites' })
  addFavorite(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.eventsService.addFavorite(id, user.id);
  }

  // ১০.২ ফেভারিট থেকে ইভেন্ট রিমুভ করা (Protected - All Roles)
  @Delete(':id/favorite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove event from favorites' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event removed from favorites' })
  @ApiResponse({ status: 404, description: 'Not in favorites' })
  removeFavorite(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.eventsService.removeFavorite(id, user.id);
  }
}
