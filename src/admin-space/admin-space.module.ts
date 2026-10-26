import { Module } from '@nestjs/common';
import { AdminSpaceController } from './admin-space.controller';
import { AdminSpaceService } from './admin-space.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpaceEntity } from 'src/entity/space.entity';
import { AdminPostModule } from 'src/admin-post/admin-post.module';
import { AdminAuthModule } from 'src/admin-auth/admin-auth.module';
import { CmsMembersGuard } from 'src/cms-members/cms-members.guard';

@Module({
  imports: [
    AdminAuthModule,
    TypeOrmModule.forFeature([SpaceEntity], 'mimate'),
    AdminPostModule,
  ],
  controllers: [AdminSpaceController],
  providers: [AdminSpaceService, CmsMembersGuard],
  exports: [AdminSpaceService],
})
export class AdminSpaceModule {}
