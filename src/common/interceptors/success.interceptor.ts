import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { map, Observable } from 'rxjs';

@Injectable()
export class SuccessInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const responseObj = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((response) => {
        const statusCode = responseObj.statusCode;
        return {
          success: true,
          alert: {
            code: statusCode,
            message: response?.message || 'Request successful',
          },
          data: response?.data !== undefined ? response.data : response,
        };
      }),
    );
  }
}
