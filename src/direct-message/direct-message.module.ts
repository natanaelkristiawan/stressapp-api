import { ContentModerationModule } from '../content-moderation/content-moderation.module';
import { Module } from '@nestjs/common';
import { DirectMessageService } from './direct-message.service';
import {
  DirectMessageController,
  MemberChatsController,
} from './direct-message.controller';
import { Conversation } from 'src/entity/convertation.entity';
import { Message } from 'src/entity/message.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { UserFollowEntity } from 'src/entity/user-follow.entity';
import { ActivityModule } from 'src/activity/activity.module';
import { QueueModule } from 'src/queue/queue.module';
import { MemberAuthModule } from 'src/member-auth/member-auth.module';

@Module({
  imports: [
    MemberAuthModule,
    ContentModerationModule,
    TypeOrmModule.forFeature(
      [UserMimateEntity, Conversation, Message, UserFollowEntity],
      'mimate',
    ),
    ActivityModule,
    QueueModule,
  ],
  providers: [DirectMessageService],
  controllers: [DirectMessageController, MemberChatsController],
})
export class DirectMessageModule {}
