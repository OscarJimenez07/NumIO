import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger sólo si SWAGGER_ENABLED=true (default en desarrollo, off en producción)
  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('NumIO API')
      .setDescription(
        'API REST de la plataforma interactiva NumIO. Análisis Numérico e Investigación de Operaciones — UTS BAN-00311.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`NumIO API listening on http://localhost:${port}`, 'Bootstrap');
  if (swaggerEnabled) {
    Logger.log(`Swagger docs at http://localhost:${port}/api/docs`, 'Bootstrap');
  } else {
    Logger.log('Swagger deshabilitado (set SWAGGER_ENABLED=true para activarlo).', 'Bootstrap');
  }
}
bootstrap();
