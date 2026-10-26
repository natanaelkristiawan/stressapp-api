import { Module } from '@nestjs/common';
import { ReactionController } from './reaction.controller';
import { ReactionService } from './reaction.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { PostEntity } from 'src/entity/post.entity';  
import { Activity } from 'src/entity/activity.entity';
import { ActivityModule } from 'src/activity/activity.module';
import { QueueModule } from 'src/queue/queue.module';
import { UserFollowEntity } from 'src/entity/user-follow.entity';
@Module({
  imports: [TypeOrmModule.forFeature([ReactionEntity, PostEntity, UserMimateEntity, Activity, UserFollowEntity], 'mimate'),
    ActivityModule,
    QueueModule,
  ],
  controllers: [ReactionController],
  providers: [ReactionService],
  exports: [ReactionService],
})
export class ReactionModule {}
