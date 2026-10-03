import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { SanitizePipe } from './common/pipes/sanitize.pipe.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { assertMockPaymentAllowed } from './common/utils/payment-mode.js';

async function bootstrap() {
  // Fail fast: mock payments must never run in production.
  assertMockPaymentAllowed();

  const app = await NestFactory.create(AppModule);

  // Render/Vercel sit in front of the API; trust one proxy hop so rate limits see the client IP.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // 1. Helmet Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(cookieParser());

  // 2. CORS: only the known storefront origins may call the API from a browser
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'https://lustre-and-co.vercel.app',
  ];

  const envOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const allowedOrigins = [
    ...new Set([
      ...defaultOrigins.map((o) => o.replace(/\/+$/, '')),
      ...envOrigins,
    ]),
  ];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // No Origin header means a non-browser client (curl, server-to-server): allowed.
      const normalizedOrigin = origin ? origin.replace(/\/+$/, '') : '';
      callback(null, !origin || allowedOrigins.includes(normalizedOrigin));
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'Content-Type', 'X-Total-Count'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
  });

  // 3. Global Request Logging Interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 4. Global Input Sanitization & Validation Pipes
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 5. API Global Prefix: /api
  app.setGlobalPrefix('api');

  // 6. Interactive Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Lustre & Co. Enterprise API')
    .setDescription('Production-Grade Imitation Jewelry Architecture (NestJS + Supabase + RBAC + 2FA)')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');
  console.log(`✨ Server running on: http://localhost:${port}/api`);
  console.log(`📖 Swagger Docs: http://localhost:${port}/api/docs`);
}
bootstrap();
