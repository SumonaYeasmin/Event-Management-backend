// import { NestFactory } from '@nestjs/core';
// import { AppModule, ObserveInstrument } from './app.module.js';
// import { ValidationPipe } from '@nestjs/common';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule, {
//     instrument: ObserveInstrument,
//   });
//   app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
//   await app.listen(process.env.PORT ?? 3000);
// }
// await bootstrap();



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

