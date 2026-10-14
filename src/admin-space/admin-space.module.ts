import { Module } from '@nestjs/common';
import { AdminSpaceController } from './admin-space.controller';
import { AdminSpaceService } from './admin-space.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpaceEntity } from 'src/entity/space.entity';
import { AdminPostModule } from 'src/admin-post/admin-post.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpaceEntity], 'mimate'),
    AdminPostModule
  ],
  controllers: [AdminSpaceController],
  providers: [AdminSpaceService],
  exports:[AdminSpaceService]
})
export class AdminSpaceModule {}
