// src/common/interceptors/logging.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import { RequestLogService } from '../../request-log/request-log.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logService: RequestLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (
      [
        'PostController',
        'AdminPostController',
        'CommentController',
        'MemberAuthController',
        'MemberWebAuthController',
        'PushDevicesController',
        'CmsPushSettingsController',
        'CmsModerationSettingsController',
        'AdminAuthController',
        'CmsMembersController',
        'PsychoeducationController',
        'ContentImportController',
        'MemberContentController',
        'CmsMoodParticipationController',
        'MoodTrackerController',
        'AssessmentController',
        'CmsAssessmentController',
        'UploadController',
      ].includes(context.getClass().name)
    )
      return next.handle();
    const now = Date.now();
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const handler = context.getHandler();
    const controller = context.getClass();

    const { method, originalUrl, body, params, query } = request;

    return next.handle().pipe(
      tap(async (resData) => {
        const duration = Date.now() - now;

        const log = {
          method,
          url: originalUrl,
          controller: controller.name,
          handler: handler.name,
          params,
          query,
          body,
          response: null,
          statusCode: response.statusCode,
          duration: `${duration}ms`,
          backup_member_id: request['userData']?.id ?? null,
        };

        // Only log if userData exists
        if (request['userData']) {
          await this.logService.create(log);
        }
      }),
    );
  }
}
