import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { QueryEventDto } from './dto/query-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  // ১. নতুন ইভেন্ট তৈরি (Default Status: PENDING - অ্যাডমিন অনুমোদনের অপেক্ষায় থাকবে)
  async create(organizerId: string, dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        bannerImage: dto.bannerImage,
        date: new Date(dto.date),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        location: dto.location,
        category: dto.category,
        eventType: dto.eventType ?? 'IN_PERSON',
        ticketPrice: dto.ticketPrice ?? 0.0,
        totalSeats: dto.totalSeats,
        availableSeats: dto.totalSeats, // শুরুতে সমস্ত সিট অবশিষ্ট থাকবে
        isFeatured: dto.isFeatured ?? false,
        status: EventStatus.PENDING, // 👈 অ্যাডমিনের অ্যাপ্রুভালের জন্য PENDING থাকবে
        organizerId,
      },
    });
  }

  // ২. সমস্ত পাবলিক ইভেন্ট দেখা (শুধু PUBLISHED ইভেন্টগুলো সাধারণ ইউজাররা দেখবে)
  async findAll(query: QueryEventDto) {
    const { search, category, eventType, page = 1, limit = 5 } = query;
    const skip = (page - 1) * limit;
    const where: any = { status: EventStatus.PUBLISHED };

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }
    if (eventType) {
      where.eventType = eventType;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'asc' },
        include: {
          organizer: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ৩. অর্গানাইজারের নিজের তৈরি করা সমস্ত ইভেন্ট (PENDING, PUBLISHED সব স্ট্যাটাস দেখবে)
  async findMyEvents(organizerId: string) {
    return this.prisma.event.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // ৪. নির্দিষ্ট একটি ইভেন্টের বিস্তারিত দেখা
  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }

  // ৫. ইভেন্ট আপডেট করা (শুধু যে তৈরি করেছে বা অ্যাডমিন আপডেট করতে পারবে)
  async update(id: string, organizerId: string, dto: UpdateEventDto) {
    const event = await this.findOne(id);
    // সিকিউরিটি চেক: অর্গানাইজার ম্যাচ করে কিনা
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException(
        'You are not authorized to update this event',
      );
    }
    const { date, endDate, ...rest } = dto;
    return this.prisma.event.update({
      where: { id },
      data: {
        ...rest,
        ...(date && { date: new Date(date) }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
      },
    });
  }

  // ৬. ইভেন্ট ডিলিট করা (শুধু যে তৈরি করেছে সেই মুছতে পারবে)
  async remove(id: string, organizerId: string) {
    const event = await this.findOne(id);
    // সিকিউরিটি চেক: অর্গানাইজার ম্যাচ করে কিনা
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException(
        'You are not authorized to delete this event',
      );
    }
    return this.prisma.event.delete({
      where: { id },
    });
  }

  // ৭. ইভেন্টে রেজিস্ট্রেশন / বুকিং করা
  async registerEvent(eventId: string, userId: string) {
    // ১. চেক: ইভেন্টটি ডাটাবেজে আছে কি না
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('Cannot register for an unpublished event');
    }

    // ২. চেক: ইউজার ইতিমধ্যে রেজিস্টার করেছে কি না
    const existingRegistration = await this.prisma.registration.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });
    if (existingRegistration) {
      throw new ConflictException('You have already registered for this event');
    }

    // ৩. চেক: সিট খালি আছে কি না
    if (event.availableSeats <= 0) {
      throw new BadRequestException('Sorry, no seats available for this event');
    }

    // ৪. ট্রানজ্যাকশন: রেজিস্ট্রেশন তৈরি করা + availableSeats ১টি কমানো
    return this.prisma.$transaction(async (tx) => {
      const registration = await tx.registration.create({
        data: {
          eventId,
          userId,
        },
        include: {
          event: {
            select: { id: true, title: true, date: true, location: true },
          },
        },
      });

      await tx.event.update({
        where: { id: eventId },
        data: {
          availableSeats: {
            decrement: 1,
          },
        },
      });

      return {
        message: 'Registration successful!',
        data: registration,
      };
    });
  }

  // ৮. অর্গানাইজারের ইভেন্টে রেজিস্টার করা অ্যাটেন্ডিদের তালিকা দেখা
  async getEventAttendees(eventId: string, organizerId: string) {
    // ১. ইভেন্টটি ডাটাবেজে আছে কি না চেক
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // ২. সিকিউরিটি চেক: লগইন করা ইউজার কি আসলেই এই ইভেন্টের অর্গানাইজার?
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException(
        'You are not authorized to view attendees for this event',
      );
    }

    // ৩. এই ইভেন্টের সমস্ত রেজিস্ট্রেশন ও ইউজারের তথ্য আনা
    const registrations = await this.prisma.registration.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ৪. ডাটা রিটার্ন
    return {
      event: {
        id: event.id,
        title: event.title,
        totalSeats: event.totalSeats,
        availableSeats: event.availableSeats,
        totalRegistered: registrations.length,
      },
      attendees: registrations.map((reg) => ({
        registrationId: reg.id,
        status: reg.status,
        registeredAt: reg.createdAt,
        user: reg.user,
      })),
    };
  }

  // ৯. ইভেন্টের রেজিস্ট্রেশন বাতিল করা (সিট আবার খালি হবে)
  async cancelRegistration(eventId: string, userId: string) {
    const registration = await this.prisma.registration.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    if (!registration) {
      throw new NotFoundException('You are not registered for this event');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.registration.delete({
        where: {
          id: registration.id,
        },
      });

      await tx.event.update({
        where: { id: eventId },
        data: {
          availableSeats: {
            increment: 1,
          },
        },
      });

      return {
        message:
          'Event registration cancelled successfully. Seat has been released.',
      };
    });
  }

  // ১০.১ ইভেন্ট ফেভারিট / বুকমার্ক করা
  async addFavorite(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('Event is already in your favorites');
    }

    const favorite = await this.prisma.favorite.create({
      data: {
        eventId,
        userId,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            bannerImage: true,
            location: true,
            date: true,
            ticketPrice: true,
          },
        },
      },
    });

    return {
      message: 'Event saved to favorites successfully',
      data: favorite,
    };
  }

  // ১০.২ ফেভারিট থেকে রিমুভ করা
  async removeFavorite(eventId: string, userId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Event not found in your favorites');
    }

    await this.prisma.favorite.delete({
      where: {
        id: favorite.id,
      },
    });

    return {
      message: 'Event removed from favorites successfully',
    };
  }

  // ১০.৩ ইউজারের নিজের সেভ করা সমস্ত ইভেন্টের তালিকা আনা
  async getMyFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          include: {
            organizer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return {
      total: favorites.length,
      data: favorites.map((fav) => fav.event),
    };
  }

  // ==========================================
  // 🛡️ ১৭. অ্যাডমিন মডারেশন মেথডস (ADMIN ONLY)
  // ==========================================

  // ১৭.১ অ্যাডমিনের জন্য সব ইভেন্ট ফেচ করা (ফিল্টারিং ও পেজিনেশন সহ)
  async findAllForAdmin(query: {
    status?: EventStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organizer: {
            select: { id: true, name: true, email: true, role: true },
          },
          _count: {
            select: {
              registrations: true,
              favorites: true,
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ১৭.২ অ্যাডমিন কর্তৃক ইভেন্টের স্ট্যাটাস আপডেট করা (Approve, Reject, Cancel)
  async updateEventStatusByAdmin(id: string, status: EventStatus) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data: { status },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      message: `Event status successfully updated to ${status}`,
      data: updatedEvent,
    };
  }

  // ১৭.৩ অ্যাডমিন কর্তৃক সরাসরি যেকোনো ইভেন্ট সম্পূর্ণ ডিলিট করা (Force Delete)
  async deleteEventByAdmin(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    await this.prisma.event.delete({
      where: { id },
    });

    return {
      message: `Event '${event.title}' permanently deleted by Admin`,
    };
  }
}
