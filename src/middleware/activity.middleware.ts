import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from 'express';
import {Redis} from 'ioredis';
import { ActivityService } from 'src/activity/activity.service';
import { AuthService } from 'src/auth/auth.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
@Injectable()
export class ActivityMiddleware implements NestMiddleware {
    private redis: Redis;
    constructor(private readonly activityService: ActivityService, private readonly authService: AuthService, private readonly redisService: RedisService) {
        this.redis = this.redisService.getOrNil('default')
        if (!this.redis) {
            console.warn('Redis client not found. Skipping cache initialization.');
        }
    }

    async use(req: Request, res: Response, next: NextFunction) {
        const exactUrls = ['/is-live', '/profile/me'];
        const likeUrlPrefix = '/post/highlight';
    
        if (typeof req['userData'] === 'object') {
            const userData = req['userData'];
            const userKey = `user:${userData.id}`;
            const user = await this.redis.get(userKey);
    
            const url = req.originalUrl.split('?')[0];
    
            // Check if URL is blocked
            const isBlocked = url.startsWith(likeUrlPrefix) || exactUrls.includes(url);
    
            if (!user && !isBlocked) {
                await this.activityService.createActivity({
                    userId: userData.id,
                    action: 'login',
                    targetType: 'login'
                });

                // set activated
                await this.authService.setActiveUser(userData.id)
    
                await this.redis.set(userKey, JSON.stringify(userData), 'EX', 60 * 5);
            } else if (isBlocked) {
            }
    
            // Update last activity
            await this.authService.updateLastActivity(userData.id);
        }
    
        next();
    }
    
}