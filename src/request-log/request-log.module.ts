import { Module } from '@nestjs/common';
import { RequestLogController } from './request-log.controller';
import { RequestLogService } from './request-log.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestLogEntity } from 'src/entity/log.entity'; 

@Module({
  imports: [TypeOrmModule.forFeature([RequestLogEntity], 'mimate')],
  controllers: [RequestLogController],
  providers: [RequestLogService],
  exports: [RequestLogService]
})
export class RequestLogModule {}
