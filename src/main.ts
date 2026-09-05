import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // ফ্রন্টএন্ড থেকে অতিরিক্ত কোনো ফিল্ড আসলে এরর না দিয়ে বাদ দিয়ে দিবে
      transform: true,
    }),
  );

  // 📖 Swagger API Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Event Management System API')
    .setDescription(
      'Interactive REST API documentation for the Event Management Backend application.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Event Management API Docs',
  });

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`🚀 Server running on: http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger API Docs: http://localhost:${port}/api/docs`);
}

bootstrap();
