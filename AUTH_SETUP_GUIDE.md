# 🚀 NestJS (ESM) + Prisma 7 + Neon DB + JWT Auth: Complete Master Guide

এই গাইডে আধুনিক NestJS (ES Module), Prisma 7, Neon PostgreSQL, JWT Authentication এবং Role-Based Security-এর সম্পূর্ণ ১৮টি ধাপ ক্রমানুসারে সাজানো হয়েছে যাতে যেকোনো প্রজেক্টে একবারেই কপি-পেস্ট করে ব্যবহার করা যায়।

---

### 1️⃣ Install Packages
টার্মিনালে এই কমান্ডটি চালান:
```bash
# Prisma 7 এবং PostgreSQL Driver Adapter (Prisma 7-এ আবশ্যক)
npm install @prisma/client @prisma/adapter-pg pg dotenv
npm install -D prisma @types/pg

# Security, Password Hashing ও JWT
npm install bcrypt @nestjs/jwt @nestjs/passport passport passport-jwt
npm install -D @types/bcrypt @types/passport-jwt

# Validation
npm install class-validator class-transformer
```

---

### 2️⃣ Prisma Setup & Config (Prisma 7)
টার্মিনালে প্রিজমা ইনিশিয়ালাইজ করুন:
```bash
npx prisma init
```

প্রজেক্টের রুট ডিরেক্টরিতে **`prisma.config.ts`** ফাইলটি তৈরি করুন:
```typescript
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

---

### 3️⃣ .env
প্রজেক্টের রুটে **`.env`** ফাইলে ভ্যারিয়েবলগুলো দিন:
```env
DATABASE_URL="postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="1d"
PORT=5000
```

---

### 4️⃣ prisma/schema.prisma
**`prisma/schema.prisma`** ফাইলে মডেল ও জেনারেটর ডিফাইন করুন:
```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

enum Role {
  USER
  ADMIN
  ORGANIZER
}

model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

### 5️⃣ Migration & Generate
টার্মিনালে মাইগ্রেশন এবং টাইপ জেনারেট চালান:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

### 6️⃣ Prisma Module & Service
টার্মিনালে জেনারেট করুন:
```bash
nest g module prisma
nest g service prisma
```

**`src/prisma/prisma.service.ts`**:
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**`src/prisma/prisma.module.ts`**:
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

---

### 7️⃣ main.ts
**`src/main.ts`**:
```typescript
import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 5000);
}

bootstrap();
```

---

### 8️⃣ Auth Generate
টার্মিনালে কমান্ডগুলো চালান:
```bash
nest g module modules/auth
nest g controller modules/auth --no-spec
nest g service modules/auth --no-spec
```

ফোল্ডার সাজিয়ে নিন:
```
src/
├── guards/
│   └── jwt-auth.guard.ts
└── modules/auth/
    ├── auth.controller.ts
    ├── auth.service.ts
    ├── auth.module.ts
    ├── dto/
    │   ├── register.dto.ts
    │   └── login.dto.ts
    └── strategies/
        └── jwt.strategy.ts
```

---

### 9️⃣ Register DTO
**`src/modules/auth/dto/register.dto.ts`**:
```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6, {
    message: 'Password must be at least 6 characters long',
  })
  password: string;
}
```

---

### 🔟 Login DTO
**`src/modules/auth/dto/login.dto.ts`**:
```typescript
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
```

---

### 1️⃣1️⃣ Auth Service
**`src/modules/auth/auth.service.ts`**:
```typescript
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // REGISTER
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
      },
    });

    const { password, ...result } = user;

    return {
      message: 'User registered successfully',
      data: result,
    };
  }

  // LOGIN
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
```

---

### 1️⃣2️⃣ Auth Controller
**`src/modules/auth/auth.controller.ts`**:
```typescript
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request) {
    return {
      message: 'Profile fetched successfully',
      user: req.user,
    };
  }
}
```

---

### 1️⃣3️⃣ Auth Module
**`src/modules/auth/auth.module.ts`**:
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret',
      signOptions: {
        expiresIn: '1d',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

---

### 1️⃣4️⃣ JWT Strategy
**`src/modules/auth/strategies/jwt.strategy.ts`**:
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret',
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const { password, ...result } = user;
    return result;
  }
}
```

---

### 1️⃣5️⃣ JWT Auth Guard
**`src/guards/jwt-auth.guard.ts`**:
```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

---

### 1️⃣6️⃣ Protected Route
যেকোনো কন্ট্রোলারে প্রটেক্টেড রাউট ব্যবহার করতে:
```typescript
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';

@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }
}
```

---

### 1️⃣7️⃣ App Module
**`src/app.module.ts`**:
```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

### 1️⃣8️⃣ Server Start
টার্মিনালে সার্ভার রান করুন:
```bash
npm run start:dev
```
