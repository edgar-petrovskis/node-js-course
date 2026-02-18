import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { setupSwagger } from './infrastructure/swagger-setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
