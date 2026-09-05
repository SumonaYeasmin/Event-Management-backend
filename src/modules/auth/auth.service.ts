

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Registration
  async register(dto: RegisterDto) {
    if (dto.confirmPassword && dto.password !== dto.confirmPassword) {
      throw new BadRequestException(
        'Password and Confirm Password do not match',
      );
    }

    const userName = dto.name || dto.fullName || dto.email.split('@')[0];

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    // Role handling (if sent by frontend)
    let userRole = dto.role ?? 'USER';
    if (userRole !== 'USER' && userRole !== 'ADMIN' && userRole !== 'ORGANIZER') {
      userRole = 'USER';
    }

    const user = await this.prisma.user.create({
      data: {
        name: userName,
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        role: userRole,
      },
    });

    const { password, ...result } = user;
    return {
      success: true,
      statusCode: 201,
      message: 'User registered successfully',
      data: result,
    };
  }

  // Login
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return {
      success: true,
      statusCode: 200,
      message: 'Login successful',
      accessToken,
      user: userResponse,
      data: {
        accessToken,
        user: userResponse,
      },
    };
  }

  // Change Password
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // ১. চেক করা বর্তমান পাসওয়ার্ড ডাটাবেজের পাসওয়ার্ডের সাথে মিলে কিনা
    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Current password does not match');
    }

    // ২. নতুন পাসওয়ার্ড ও পুরোনো পাসওয়ার্ড একই কিনা চেক করা
    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password cannot be the same as current password',
      );
    }

    // ৩. নতুন পাসওয়ার্ড হ্যাশ করে ডাটাবেজে আপডেট করা
    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  // Forgot Password (Generate & Save OTP)
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('No user registered with this email address');
    }

    // ৬ ডিজিটের র‍্যান্ডম OTP জেনারেট (১০০০০০ থেকে ৯৯৯৯৯৯)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ১০ মিনিটের এক্সপায়ার সময় নির্ধারণ
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // ডাটাবেজে ওটিপি ও মেয়াদ সেভ করা
    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        resetOtp: otp,
        resetOtpExpiresAt: expiresAt,
      },
    });

    // টার্মিনালে ডেভেলপার ও টেস্টিং সুবিধার জন্য ওটিপি সুন্দরভাবে লগ করা
    console.log('\n==================================================');
    console.log(`🔐 PASSWORD RESET OTP for ${dto.email}`);
    console.log(`👉 OTP Code: ${otp}`);
    console.log(`⏳ Valid until: ${expiresAt.toLocaleTimeString()}`);
    console.log('==================================================\n');

    return {
      message: 'Password reset OTP has been generated and sent',
      email: dto.email,
      expiresIn: '10 minutes',
      otp, // টেস্টিং সুবিধার জন্য রেসপন্সেও দেওয়া হলো
    };
  }

  // Verify OTP
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('No user registered with this email address');
    }

    // ওটিপি মিলছে কিনা যাচাই
    if (!user.resetOtp || user.resetOtp !== dto.otp) {
      throw new BadRequestException('Invalid OTP code');
    }

    // ওটিপির মেয়াদ আছে কিনা যাচাই
    if (!user.resetOtpExpiresAt || user.resetOtpExpiresAt < new Date()) {
      throw new BadRequestException(
        'OTP code has expired. Please request a new one.',
      );
    }

    return {
      message: 'OTP verified successfully',
      valid: true,
    };
  }

  // Reset Password
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('No user registered with this email address');
    }

    // ওটিপি মিলছে কিনা যাচাই
    if (!user.resetOtp || user.resetOtp !== dto.otp) {
      throw new BadRequestException('Invalid OTP code');
    }

    // ওটিপির মেয়াদ আছে কিনা যাচাই
    if (!user.resetOtpExpiresAt || user.resetOtpExpiresAt < new Date()) {
      throw new BadRequestException(
        'OTP code has expired. Please request a new one.',
      );
    }

    // নতুন পাসওয়ার্ড হ্যাশ করা
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // পাসওয়ার্ড আপডেট এবং ওটিপি ফিল্ডগুলো মুছে ফেলা (যাতে একই ওটিপি আর ব্যবহার না করা যায়)
    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        password: hashedPassword,
        resetOtp: null,
        resetOtpExpiresAt: null,
      },
    });

    return {
      message:
        'Password reset successfully. You can now login with your new password.',
    };
  }
}




