import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import type { RequestWithId } from './request-id.middleware.js';

type ApiError = {
  code: string;
  message: string;
  requestId: string;
};

const errorByStatus: Partial<Record<number, Omit<ApiError, 'requestId'>>> = {
  [HttpStatus.BAD_REQUEST]: {
    code: 'VALIDATION_ERROR',
    message: 'La solicitud contiene datos inválidos.',
  },
  [HttpStatus.UNAUTHORIZED]: {
    code: 'UNAUTHORIZED',
    message: 'Debe iniciar sesión para continuar.',
  },
  [HttpStatus.FORBIDDEN]: {
    code: 'FORBIDDEN',
    message: 'No tiene permisos para realizar esta acción.',
  },
  [HttpStatus.NOT_FOUND]: {
    code: 'NOT_FOUND',
    message: 'No encontramos el recurso solicitado.',
  },
  [HttpStatus.CONFLICT]: {
    code: 'CONFLICT',
    message: 'La solicitud entra en conflicto con el estado actual.',
  },
};

const safeCodePattern = /^[A-Z][A-Z0-9_]{1,63}$/;

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const defaultError = errorByStatus[status] ?? {
      code: status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
      message:
        status >= 500
          ? 'Lo sentimos, no pudimos procesar la solicitud. Intente nuevamente.'
          : 'No pudimos procesar la solicitud.',
    };
    const declaredError = this.getDeclaredError(exception);

    response.status(status).json({
      code: declaredError?.code ?? defaultError.code,
      message: declaredError?.message ?? defaultError.message,
      requestId: request.requestId ?? 'request-id-unavailable',
    } satisfies ApiError);
  }

  private getDeclaredError(
    exception: unknown,
  ): Omit<ApiError, 'requestId'> | undefined {
    if (!(exception instanceof HttpException) || exception.getStatus() >= 500) {
      return undefined;
    }

    const body = exception.getResponse();
    if (typeof body !== 'object' || body === null) {
      return undefined;
    }

    const { code, message } = body as Record<string, unknown>;
    if (
      typeof code === 'string' &&
      safeCodePattern.test(code) &&
      typeof message === 'string'
    ) {
      return { code, message };
    }

    return undefined;
  }
}
