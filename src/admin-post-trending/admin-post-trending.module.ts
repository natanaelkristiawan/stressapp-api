import { Module } from '@nestjs/common';
import { AdminPostTrendingController } from './admin-post-trending.controller';
import { AdminPostTrendingService } from './admin-post-trending.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostEntity } from 'src/entity/post.entity';
import { QueueModule } from 'src/queue/queue.module';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
@Module({
  imports: [TypeOrmModule.forFeature([PostEntity, UserMimateEntity], 'mimate'), QueueModule],
  controllers: [AdminPostTrendingController],
  providers: [AdminPostTrendingService]
})
export class AdminPostTrendingModule {}
