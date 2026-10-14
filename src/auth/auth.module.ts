import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { SpaceEntity } from 'src/entity/space.entity';
import { SpaceModule } from 'src/space/space.module';
import { MemberSpaceEntity } from 'src/entity/member-spaces.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserMimateEntity, SpaceEntity, MemberSpaceEntity], 'mimate'),
    SpaceModule
  ],
  providers: [AuthService],
  controllers: [],
  exports: [AuthService]
})
export class AuthModule {}
