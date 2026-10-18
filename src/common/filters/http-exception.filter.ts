import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    if (
      status === 500 &&
      /^\/upload\/(image|audio)\/?$/.test(request.originalUrl.split('?')[0])
    ) {
      // Do not log exceptions/stacks: database and SDK errors can contain SQL, keys or URLs.
      const code: unknown = exception?.driverError?.code ?? exception?.code;
      const safeCode =
        typeof code === 'string' && /^[A-Z0-9_]{1,64}$/.test(code)
          ? code
          : 'UNCLASSIFIED';
      const name =
        exception instanceof Error &&
        /^[A-Za-z0-9_]{1,64}$/.test(exception.name)
          ? exception.name
          : 'UnknownError';
      this.logger.error(`Shared upload failed: name=${name} code=${safeCode}`);
    }

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
        message: message,
      },
      data: null,
    };

    response.status(status).json(errorResponse);
  }
}
