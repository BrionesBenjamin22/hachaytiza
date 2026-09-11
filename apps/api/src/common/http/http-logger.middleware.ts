import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { RequestWithId } from './request-id.middleware.js';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();

    response.once('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      process.stdout.write(
        `${JSON.stringify({
          event: 'http.request',
          requestId: request.requestId,
          method: request.method,
          path: request.path,
          status: response.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
        })}\n`,
      );
    });

    next();
  }
}
