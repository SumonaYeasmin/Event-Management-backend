import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Role } from '../../generated/prisma/enums.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ডাটাবেজ থেকে সব ইউজার / রোল অনুযায়ী ফিল্টার করে ফেচ করা
  async findAll(role?: Role) {
    const users = await this.prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            registrations: true,
            events: true,
          },
        },
        events: {
          select: {
            id: true,
            title: true,
            description: true,
            bannerImage: true,
            date: true,
            endDate: true,
            location: true,
            category: true,
            eventType: true,
            ticketPrice: true,
            totalSeats: true,
            availableSeats: true,
            isFeatured: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                registrations: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: users,
    };
  }

  // একক ইউজার / অর্গানাইজারের বিস্তারিত দেখা
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            registrations: true,
            events: true,
          },
        },
        events: {
          select: {
            id: true,
            title: true,
            description: true,
            bannerImage: true,
            date: true,
            endDate: true,
            location: true,
            category: true,
            eventType: true,
            ticketPrice: true,
            totalSeats: true,
            availableSeats: true,
            isFeatured: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                registrations: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      data: user,
    };
  }
}


