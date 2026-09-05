import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { QueryEventDto } from './dto/query-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';


@Injectable()
export class EventsService {
    constructor(private readonly prisma: PrismaService){}

 // ১. নতুন ইভেন্ট তৈরি (availableSeats স্বয়ংক্রিয়ভাবে totalSeats এর সমান সেট হবে)
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
        organizerId,
      },
    });
  }


   // ৩. সমস্ত ইভেন্ট দেখা (Search, Filter, Pagination সহ)
  async findAll(query: QueryEventDto) {
    const { search, category, eventType, page = 1, limit = 5 } = query;
    const skip = (page - 1) * limit;
    const where: any = { status: 'PUBLISHED' };
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


  // ৩. অর্গানাইজারের নিজের তৈরি করা ইভেন্টগুলো
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
  // ৫. ইভেন্ট আপডেট করা (শুধু যে তৈরি করেছে সেই আপডেট করতে পারবে)
  async update(id: string, organizerId: string, dto: UpdateEventDto) {
    const event = await this.findOne(id);
    // সিকিউরিটি চেক: অর্গানাইজার ম্যাচ করে কিনা
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You are not authorized to update this event');
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
      throw new ForbiddenException('You are not authorized to delete this event');
    }
    return this.prisma.event.delete({
      where: { id },
    });
  }
}

    

