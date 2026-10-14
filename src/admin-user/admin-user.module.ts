import { Module } from '@nestjs/common';
import { AdminUserController } from './admin-user.controller';
import { AdminUserService } from './admin-user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { Activity } from 'src/entity/activity.entity';
import { ActivityModule } from 'src/activity/activity.module';
import { QuestPoint } from 'src/entity/quest-point.entity';
import { QuestPointDetail } from 'src/entity/quest-point-detail.entity';
import { DataSource } from 'typeorm';
import { QuestModule } from 'src/quest/quest.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([UserMimateEntity, Activity, QuestPoint, QuestPointDetail, DataSource], 'mimate'),
    ActivityModule,
    QuestModule
  ],
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService]
})
export class AdminUserModule { }
