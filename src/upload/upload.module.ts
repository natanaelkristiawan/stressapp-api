import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsEntity } from 'src/entity/asset.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';


@Module({
  imports:[
    TypeOrmModule.forFeature([AssetsEntity, UserMimateEntity], 'mimate'),
  ],
  providers: [UploadService],
  controllers: [UploadController]
})
export class UploadModule {}
