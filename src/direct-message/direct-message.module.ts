import { Module } from '@nestjs/common';
import { DirectMessageService } from './direct-message.service';
import { DirectMessageController } from './direct-message.controller';
import { Conversation } from 'src/entity/convertation.entity';
import { Message } from 'src/entity/message.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { ActivityModule } from 'src/activity/activity.module';
import { QueueModule } from 'src/queue/queue.module';
@Module({
  imports:[
    TypeOrmModule.forFeature([UserMimateEntity, Conversation, Message], 'mimate'),
    ActivityModule,
    QueueModule
  ],
  providers: [DirectMessageService],
  controllers: [DirectMessageController]
})
export class DirectMessageModule {}
