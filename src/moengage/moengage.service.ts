import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MoengageService {
  constructor(
    @InjectQueue('moengage') private readonly moengageQueue: Queue,
  ) {}

  async sendUserData(parameters: any) {
    await this.moengageQueue.add('send-user-data', parameters);
  }

  async sendEventData(parameters: any) {
    await this.moengageQueue.add('send-event-data', parameters);
  }
}
