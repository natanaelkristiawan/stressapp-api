import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Processor('moengage')
export class MoengageProcessor extends WorkerHost {
  private readonly logger = new Logger(MoengageProcessor.name);
  private readonly appId: string;
  private readonly appKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    super();
    this.appId = process.env.MOENGAGE_APP_ID;
    this.appKey = process.env.MOENGAGE_APP_KEY;
  }

  async process(job: Job<any, any, string>): Promise<void> {
    const { name, data } = job;

    let endpoint = '';
    if (name === 'send-user-data') {
      endpoint = `https://api-01.moengage.com/v1/customer/${this.appId}`;
    } else if (name === 'send-event-data') {
      endpoint = `https://api-01.moengage.com/v1/event/${this.appId}`;
    } else {
      this.logger.warn(`Unknown job type: ${name}`);
      return;
    }

    try {
      const authHeader = Buffer.from(`${this.appId}:${this.appKey}`).toString('base64');

      const result = await firstValueFrom(
        this.httpService.post(endpoint, data, {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json',
            'MOE-APPKEY': this.appId,
          },
        }).pipe(
          catchError((error) => {
            throw error;
          }),
        )
      );

      this.logger.log(`Successfully sent ${name} to MoEngage: ${JSON.stringify(result.data)}`);
    } catch (error: any) {
      const errorMsg = error?.response?.data || error.message || error;
      this.logger.error(`Failed to send ${name} to MoEngage: ${JSON.stringify(errorMsg)}`);
    }
  }
}
