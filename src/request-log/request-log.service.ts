import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestLogEntity } from 'src/entity/log.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RequestLogService {

    constructor(
        @InjectRepository(RequestLogEntity, 'mimate')
        private readonly logRepo: Repository<RequestLogEntity>,
      ) {}
    
      async create(log: Partial<RequestLogEntity>) {

        // skip when hit api is-live
        if(log.handler == 'getStatus'){
          return true
        }
        const newLog = this.logRepo.create(log);
        await this.logRepo.save(newLog);
        return true
      }
}
