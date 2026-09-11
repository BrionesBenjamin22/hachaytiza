import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export type RequestWithId = Request & { requestId?: string };

const REQUEST_ID_HEADER = 'x-request-id';
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,100}$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const incomingRequestId = request.header(REQUEST_ID_HEADER);
    const requestId =
      incomingRequestId && SAFE_REQUEST_ID.test(incomingRequestId)
        ? incomingRequestId
        : `req_${randomUUID()}`;

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
