import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { MemberAuthService } from './member-auth.service';

export interface MemberRequest {
  headers: { authorization?: string };
  member: { id: number };
  sessionId: string;
}

@Injectable()
export class MemberAuthGuard implements CanActivate {
  /** Injects the shared live-session validator. Returns a member-only guard. */
  constructor(private readonly auth: MemberAuthService) {}

  /** Validates the member JWT/session/account. Returns true with server-owned request identity. */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    context
      .switchToHttp()
      .getResponse<{ setHeader(name: string, value: string): void }>()
      .setHeader('Cache-Control', 'private, no-store');
    const request = context.switchToHttp().getRequest<MemberRequest>();
    const header = request.headers.authorization;
    if (typeof header !== 'string' || !/^Bearer \S+$/.test(header)) {
      throw new UnauthorizedException('Sesi tidak valid.');
    }
    const session = await this.auth.authenticateSession(header.slice(7));
    request.member = session.member;
    request.sessionId = session.sessionId;
    return true;
  }
}
