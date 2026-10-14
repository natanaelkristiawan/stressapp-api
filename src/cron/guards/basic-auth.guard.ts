import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BasicAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) { }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const cronUserKey = process.env.CRON_USER_KEY;
    const cronPasswordKey = process.env.CRON_PASSWORD_KEY;

    if (!cronUserKey || !cronPasswordKey) {
      throw new UnauthorizedException('CRON_USER_KEY or CRON_PASSWORD_KEY configuration is missing on server');
    }

    const token = authHeader.substring(6).trim();
    const decoded = Buffer.from(token, 'base64').toString('utf-8');

    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex === -1) {
      throw new UnauthorizedException('Invalid Basic Authentication format');
    }

    const user = decoded.substring(0, separatorIndex);
    const pass = decoded.substring(separatorIndex + 1);

    if (user !== cronUserKey || pass !== cronPasswordKey) {
      throw new UnauthorizedException('Invalid Basic Authentication credentials');
    }

    return true;
  }
}
