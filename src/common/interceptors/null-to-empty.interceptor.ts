// null-to-empty.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// add filter if typris date return date
function isDate(value: any): boolean {
  return value instanceof Date;
}

@Injectable()
export class NullToEmptyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Mood chart gaps and public media expiry are deliberate nulls.
    if (
      [
        'MoodTrackerController',
        'AssessmentController',
        'CmsAssessmentController',
        'PsychoeducationController',
        'MemberContentController',
      ].includes(context.getClass().name)
    )
      return next.handle();
    return next.handle().pipe(map((data) => this.replaceNulls(data)));
  }

  private replaceNulls(value: any): any {
    if (value === null) return '';

    // check if value is date
    if (isDate(value)) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.replaceNulls(v));
    }

    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, val]) => [
          key,
          this.replaceNulls(val),
        ]),
      );
    }

    return value;
  }
}
