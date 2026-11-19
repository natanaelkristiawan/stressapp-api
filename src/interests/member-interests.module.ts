import { Module } from '@nestjs/common';
import { MemberAuthModule } from '../member-auth/member-auth.module';
import { InterestsModule } from './interests.module';
import { MemberInterestsController } from './member-interests.controller';

@Module({
  imports: [InterestsModule, MemberAuthModule],
  controllers: [MemberInterestsController],
})
export class MemberInterestsModule {}
