import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { MemberAuthController } from './member-auth.controller';
import { MemberAuthService } from './member-auth.service';
@Module({
  imports: [JwtModule.register({})],
  controllers: [MemberAuthController],
  providers: [MemberAuthService],
})
export class MemberAuthModule {}
