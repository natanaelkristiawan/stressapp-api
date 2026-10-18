import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminAuthService } from '../admin-auth/admin-auth.service';

@Injectable()
export class CmsMembersGuard implements CanActivate {
  /** Injects the existing CMS identity validator. Returns an admin-only guard. */
  constructor(private readonly auth: AdminAuthService) {}

  /** Revalidates the live linked admin after CMS JWT middleware. Returns true only for active CMS users. */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ userData?: { id?: number } }>();
    const id = request.userData?.id;
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new UnauthorizedException('Invalid admin session.');
    await this.auth.currentAdmin(id);
    return true;
  }
}
