import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-02-24.acacia' as any,
    });
  }

  async createCheckoutSession(userId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== 'PUBLISHED') {
      throw new BadRequestException('Event is not published');
    }

    if (event.availableSeats <= 0) {
      throw new BadRequestException('All seats are booked');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const amountInCents = Math.round((event.ticketPrice || 0) * 100);

    // Stripe Checkout Session তৈরি
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: event.title,
              description: `${event.category} Event · ${event.location}`,
              images: event.bannerImage ? [event.bannerImage] : [],
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        eventId,
      },
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/events/${eventId}?payment=cancelled`,
    });

    // ডাটাবেজে PENDING পেমেন্ট সংরক্ষণ
    await this.prisma.payment.create({
      data: {
        amount: event.ticketPrice,
        currency: 'usd',
        status: PaymentStatus.PENDING,
        stripeSessionId: session.id,
        userId,
        eventId,
      },
    });

    return {
      url: session.url,
      sessionId: session.id,
    };
  }
}
