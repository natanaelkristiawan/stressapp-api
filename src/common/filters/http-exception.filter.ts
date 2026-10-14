import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    let message: string | string[] = 'Something went wrong';

    if (exception instanceof BadRequestException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null && 'message' in res) {
        message = (res as any).message;
      }
    } else if (exception instanceof HttpException) {
      message = exception.message;

    }

    const errorResponse = {
      success: false,
      alert: {
        code: exception?.error_code || status,
        message: message
      },
      data: null,
    };

    response.status(status).json(errorResponse);
  }
}
