import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../../decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { RolesGuard } from '../../guards/roles.guard.js';
import { CreateCheckoutDto } from './dto/create-checkout.dto.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-checkout-session')
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe Checkout Session (Only USER role)' })
  @ApiResponse({ status: 201, description: 'Checkout session created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Only USER role can purchase tickets' })
  createCheckoutSession(@Req() req: Request, @Body() dto: CreateCheckoutDto) {
    const user = (req as any).user;
    return this.paymentsService.createCheckoutSession(user.id, dto.eventId);
  }

  @Get('verify-session')
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify Stripe payment session and confirm registration (Only USER role)' })
  @ApiQuery({ name: 'session_id', required: true, description: 'Stripe Checkout Session ID' })
  @ApiResponse({ status: 200, description: 'Payment verified and ticket confirmed' })
  @ApiResponse({ status: 403, description: 'Forbidden: Only USER role can verify tickets' })
  verifySession(@Req() req: Request, @Query('session_id') sessionId: string) {
    const user = (req as any).user;
    return this.paymentsService.verifySessionAndConfirmBooking(sessionId, user.id);
  }
}
