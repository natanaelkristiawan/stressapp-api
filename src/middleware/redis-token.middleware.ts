import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import { AuthService } from 'src/auth/auth.service';
import { RedisService } from '@liaoliaots/nestjs-redis';


@Injectable()
export class RedisTokenMiddleware implements NestMiddleware {
  private redis: Redis;

  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
    private readonly redisService: RedisService
  ) {
    this.redis = this.redisService.getOrNil('default')
    if (!this.redis) {
      console.warn('Redis client not found. Skipping cache initialization.');
    }
  }

  private isRedisMemoryError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('OOM command not allowed when used memory >');
  }

  async use(req: Request, res: Response, next: NextFunction) {

    // kill the service
    // throw new UnauthorizedException('Missing or invalid token');

    const authHeader = req.headers['authorization'];
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '').trim();
    } else if (req.query?.token) {
      const qToken = String(req.query.token).trim();
      token = qToken.startsWith('Bearer ') ? qToken.replace(/^Bearer\s+/, '').trim() : qToken;
    }

    if (!token) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    const cacheKey = `token:${token}`;

    try {
      const payload = this.jwtService.verify(token, { ignoreExpiration: false }); // throws if invalid



      const dbUser = await this.authService.getUserMMID(payload.id)

      if (!dbUser) throw new UnauthorizedException('User not found');

      // if member suspended, throw error
      if (dbUser.is_suspended) {

        let message = 'Your account has been suspended, please contact support';

        throw new UnauthorizedException(message);
      }

      if (this.redis) {
        try {
          await this.redis.set(cacheKey, JSON.stringify(dbUser), 'EX', 60 * 5); // 5 min TTL
        } catch (error) {
          if (!this.isRedisMemoryError(error)) {
            console.warn('Redis write failed in auth middleware:', error);
          }
        }
      }
      req['userData'] = dbUser;
      return next();
    } catch (err) {
      throw new UnauthorizedException('Missing or invalid token');
    }
  }
}
