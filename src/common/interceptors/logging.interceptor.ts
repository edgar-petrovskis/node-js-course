import { Observable } from 'rxjs';

import { tap } from 'rxjs/operators';

import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    console.log(`Time before: ${now}`);

    return next
      .handle()
      .pipe(
        tap(() =>
          console.log(
            `Time after: ${Date.now()}\nDuration: ${Date.now() - now}ms`,
          ),
        ),
      );
  }
}
