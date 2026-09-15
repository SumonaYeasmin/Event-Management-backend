import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { CreateCheckoutDto } from './dto/create-checkout.dto.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe Checkout Session for event ticket purchase' })
  createCheckoutSession(@Req() req: Request, @Body() dto: CreateCheckoutDto) {
    const user = (req as any).user;
    return this.paymentsService.createCheckoutSession(user.id, dto.eventId);
  }

  @Get('verify-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify Stripe payment session and confirm registration' })
  @ApiQuery({ name: 'session_id', required: true, description: 'Stripe Checkout Session ID' })
  verifySession(@Req() req: Request, @Query('session_id') sessionId: string) {
    const user = (req as any).user;
    return this.paymentsService.verifySessionAndConfirmBooking(sessionId, user.id);
  }
}
