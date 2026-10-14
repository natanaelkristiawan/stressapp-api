// src/common/middleware/basic-auth.middleware.ts
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class BasicAuthMiddleware implements NestMiddleware {
  private readonly USERNAME = 'bsi';
  private readonly PASSWORD = '54yh@e76#^8%';

  use(req: Request, res: Response, next: NextFunction) {
    // Let CORS preflights pass through to avoid loops
    if (req.method === 'OPTIONS') return next();

    const auth = req.headers['authorization'];

    if (!auth || typeof auth !== 'string' || !auth.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Mimate BSI API"');
      throw new UnauthorizedException('Authentication required');
    }

    const base64Credentials = auth.slice(6).trim(); // remove "Basic "
    let decoded: string;

    try {
      decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    } catch {
      throw new UnauthorizedException('Invalid base64 credentials');
    }

    const [username, password] = decoded.split(':');

    if (username !== this.USERNAME || password !== this.PASSWORD) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Mimate BSI API"');
      throw new UnauthorizedException('Invalid username or password');
    }

    next();
  }
}
