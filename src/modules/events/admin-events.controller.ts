import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../decorators/roles.decorator.js';
import { EventStatus, Role } from '../../generated/prisma/enums.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { RolesGuard } from '../../guards/roles.guard.js';
import { EventsService } from './events.service.js';

@ApiTags('Admin Events Moderation')
@Controller('admin/events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN) // 🔒 Strictly accessible ONLY by ADMIN
@ApiBearerAuth()
export class AdminEventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ১. সমস্ত ইভেন্ট দেখা (ফিল্টার: status=PENDING, PUBLISHED, REJECTED ইত্যাদি)
  @Get()
  @ApiOperation({
    summary: 'Admin: Get all events across system with status filtering',
  })
  @ApiQuery({ name: 'status', enum: EventStatus, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'All events list for admin' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access only' })
  getAllEvents(
    @Query('status') status?: EventStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventsService.findAllForAdmin({
      status,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  // ২. ইভেন্ট অনুমোদন করা (Approve Event -> PUBLISHED)
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Admin: Approve a pending event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event approved successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  approveEvent(@Param('id') id: string) {
    return this.eventsService.updateEventStatusByAdmin(
      id,
      EventStatus.PUBLISHED,
    );
  }

  // ৩. ইভেন্ট বাতিল / রিজেক্ট করা (Reject Event -> REJECTED)
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Admin: Reject a pending event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event rejected successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  rejectEvent(@Param('id') id: string) {
    return this.eventsService.updateEventStatusByAdmin(
      id,
      EventStatus.REJECTED,
    );
  }

  // ৪. ইভেন্ট স্থগিত করা (Cancel Event -> CANCELLED)
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Admin: Cancel an event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  cancelEvent(@Param('id') id: string) {
    return this.eventsService.updateEventStatusByAdmin(
      id,
      EventStatus.CANCELLED,
    );
  }

  // ৫. যেকোনো ইভেন্ট সম্পূর্ণ মুছে ফেলা (Force Delete by Admin)
  @Delete(':id')
  @ApiOperation({ summary: 'Admin: Permanently delete an event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event deleted permanently' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  deleteEvent(@Param('id') id: string) {
    return this.eventsService.deleteEventByAdmin(id);
  }
}
