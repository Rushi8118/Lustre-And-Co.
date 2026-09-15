import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { SeederService } from './database/seeder.service.js';
// @ts-expect-error - plain JavaScript catalog data file
import { products } from './database/seed-data/products.data.js';

async function bootstrap() {
  console.log('🚀 Initializing seeder context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const seeder = app.get(SeederService);
  let exitCode = 0;

  try {
    await seeder.seed(products);
    console.log('🎉 Seeding completed.');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    exitCode = 1;
  } finally {
    await app.close();
    process.exit(exitCode);
  }
}

bootstrap();
