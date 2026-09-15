import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentStatus, RegistrationStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-02-24.acacia' as any,
    });
  }

  // ১. Stripe Checkout Session তৈরি
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

    // অর্গানাইজার নিজের ইভেন্টের টিকিট কিনতে পারবে না
    if (event.organizerId === userId) {
      throw new ForbiddenException('Organizers cannot purchase tickets for their own event');
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

  // ২. পেমেন্ট সেশন ভেরিফাই ও বুকিং কনফার্ম (No-CLI / Localhost Friendly)
  async verifySessionAndConfirmBooking(sessionId: string, userId: string) {
    if (!sessionId) {
      throw new BadRequestException('Session ID is required');
    }

    // Stripe থেকে সেশনের আসল স্ট্যাটাস চেক করা
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== 'paid') {
      throw new BadRequestException('Payment has not been completed');
    }

    const eventId = session.metadata?.eventId;
    if (!eventId) {
      throw new BadRequestException('Event ID not found in session metadata');
    }

    // ইতিমধ্যে রেজিস্ট্রেশন হয়ে থাকলে সেটিই রিটার্ন করা (যাতে পেজ রিফ্রেশ দিলে এরর না দেয়)
    const existingRegistration = await this.prisma.registration.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
      include: {
        event: true,
      },
    });

    if (existingRegistration && existingRegistration.status === RegistrationStatus.CONFIRMED) {
      return {
        success: true,
        message: 'Payment already verified and registration confirmed',
        registration: existingRegistration,
      };
    }

    // ডাটাবেজ ট্রানজেকশনে পেমেন্ট SUCCESS, রেজিস্ট্রেশন CONFIRMED, এবং সিট মাইনাস করা
    return this.prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { stripeSessionId: sessionId },
        data: {
          status: PaymentStatus.SUCCESS,
          stripePaymentId: (session.payment_intent as string) || null,
        },
      });

      const registration = await tx.registration.upsert({
        where: { userId_eventId: { userId, eventId } },
        update: { status: RegistrationStatus.CONFIRMED },
        create: { userId, eventId, status: RegistrationStatus.CONFIRMED },
        include: { event: true },
      });

      await tx.event.update({
        where: { id: eventId },
        data: {
          availableSeats: { decrement: 1 },
        },
      });

      return {
        success: true,
        message: 'Payment verified and registration confirmed successfully',
        registration,
      };
    });
  }
}
