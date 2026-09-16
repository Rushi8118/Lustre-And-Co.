import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Enable CORS for Vite Frontend
  // Browsers send an Origin with no trailing slash, so normalise configured values.
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5177')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // 2. Global Validation Pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 3. API Global Prefix: /api
  app.setGlobalPrefix('api');

  // 4. Interactive Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Lustre & Co. API')
    .setDescription('NestJS + Supabase E-Commerce API for Imitation Jewelry')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`✨ Server running on: http://localhost:${port}/api`);
  console.log(`📖 Swagger Docs: http://localhost:${port}/api/docs`);
}
bootstrap();
