import { Module } from '@nestjs/common';
import { CommentReactionService } from './comment-reaction.service';
import { CommentReactionController } from './comment-reaction.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentReactionEntity } from 'src/entity/comment-reaction.entity';
import { CommentEntity } from 'src/entity/comment.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { ActivityModule } from 'src/activity/activity.module';
import { QueueModule } from 'src/queue/queue.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommentReactionEntity,
      CommentEntity,
      UserMimateEntity 
    ], 'mimate'),
    ActivityModule,
    QueueModule
  ],
  providers: [CommentReactionService],
  controllers: [CommentReactionController]
})
export class CommentReactionModule {}
