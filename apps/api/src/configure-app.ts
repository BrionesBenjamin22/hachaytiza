import {
  RequestMethod,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ForbiddenException } from '@nestjs/common';
import { CsrfService } from './auth/csrf.service.js';
import type { Request, Response, NextFunction } from 'express';
import { ApiExceptionFilter } from './common/http/api-exception.filter.js';
import { HttpLoggerMiddleware } from './common/http/http-logger.middleware.js';
import { RequestIdMiddleware } from './common/http/request-id.middleware.js';
import { parseCorsOrigins, type Environment } from './config/environment.js';

export function configureApplication(app: INestApplication): void {
  const config = app.get(ConfigService<Environment, true>);
  const requestIdMiddleware = new RequestIdMiddleware();
  const httpLoggerMiddleware = new HttpLoggerMiddleware();

  app.use(helmet());
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));
  app.use(httpLoggerMiddleware.use.bind(httpLoggerMiddleware));
  app.use(cookieParser());
  const csrf = app.get(CsrfService);
  const origins = parseCorsOrigins(config.get('CORS_ORIGINS', { infer: true }));
  app.enableCors({ credentials: true, origin: origins });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (
        !origins.includes(req.get('Origin') ?? '') ||
        req.get('Sec-Fetch-Site') === 'cross-site' ||
        !req.cookies?.[
          `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}furvo-browser`
        ] ||
        !csrf.csrf.validateRequest(req)
      ) {
        return new ApiExceptionFilter().catch(
          new ForbiddenException({
            code: 'CSRF_INVALID',
            message:
              'No pudimos validar la solicitud. Actualice la página e intente nuevamente.',
          }),
          {
            switchToHttp: () => ({
              getRequest: () => req,
              getResponse: () => res,
            }),
          } as never,
        );
      }
    }
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  const openApiConfig = new DocumentBuilder()
    .setTitle('Hacha y Tiza API')
    .setDescription('Contrato HTTP de la API de Hacha y Tiza.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api/v1/docs', app, document);
}
