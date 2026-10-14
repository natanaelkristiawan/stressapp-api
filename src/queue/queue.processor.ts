// queue.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { JobDto } from './dtos/job.dto';
import { NotifDto } from './dtos/notif.dto';
import { Logger } from '@nestjs/common';
import { group } from 'console';

@Processor('notification-queue')
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(
    private readonly httpService: HttpService
  ) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`Processing job with data: ${JSON.stringify(job.data)}`);
    try {
      const dataJob = job.data as JobDto;
      await this.sendNotification(dataJob);
      this.logger.log('Job completed');
    } catch (error) {
      this.logger.error('Error processing job', error.stack || error.message);
      throw error; // Rethrow to mark the job as failed
    }
  }

  async sendNotification(dataJob: JobDto) {
    try {
      const url = process.env.NOTIFICATION_URL;

      if (!url) {
        throw new Error('Notification URL or Auth is not set in environment variables.');
      }

      const username = process.env.NOTIFICATION_USERNAME;
      const password = process.env.NOTIFICATION_PASSWORD;
      const token = Buffer.from(`${username}:${password}`).toString('base64');

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${token}`,
      };

    
      let data: NotifDto;

      switch (dataJob.type) {
        case 'post-comment':
          data = await this.commentNotification(dataJob.actor_name, dataJob.send_to, dataJob.post_id);
          break;
        case 'post-reaction':
            data = await this.reactionNotification(dataJob.actor_name, dataJob.send_to, dataJob.post_id);
          break;
        case 'post-comment-reply':
          data = await this.commentReplyNotification(dataJob.actor_name, dataJob.send_to, dataJob.post_id);
          break;
        case 'post-notification-highlight':
          data = await this.postNotificationHighlight(dataJob.actor_name, dataJob.send_to, dataJob.post_id);
          break;
        case 'post-notification-highlight-all-user' :
          data = await this.postNotificationHighlightAllUser(dataJob.send_to, dataJob.post_id)
          break;
        case 'post-verified-member':
          data = await this.postVerifiedMemberNotification(dataJob.actor_name, dataJob.send_to, dataJob.title, dataJob.message, dataJob.post_id, dataJob.post_category);
          break;
        case 'post-reaction-comment':
          data = await this.postReactionComment(dataJob.actor_name, dataJob.send_to, dataJob.post_id);
          break;
        
        // case 'post-notification-follower':
        //   data = await this.postNotificationFollower(dataJob.actor_name, dataJob.send_to);
        //   break;
        // case 'post-notification-space':
        //   data = await this.postNotificationSpace(dataJob.actor_name, dataJob.send_to, dataJob.space_name);
        //   break;
        case 'direct-message-notification':
          data = await this.directMessageNotification(dataJob.actor_name, dataJob.send_to, dataJob.message);
          break;

        case 'follower-notification':
          data = await this.followerNotification(dataJob.mimate_id, dataJob.send_to);
          break;
        default:
          throw new Error(`Unsupported notification type: ${dataJob.type}`);
      }


      this.logger.log(`Sending notification to ${url} with payload: ${JSON.stringify(data)}`);

      const response = await firstValueFrom(
        this.httpService.post(url, data, { headers }),
      );

      this.logger.log(`Notification response: ${JSON.stringify(response.data)}`);
      return response.data;

    } catch (error) {
      const errorMsg = error.response?.data || error.message || 'Unknown error';
      this.logger.error(`Error sending notification: ${JSON.stringify(errorMsg)}`);
      throw error;
    }
  }

  async postNotificationHighlightAllUser(send_to:number[], post_id) {
    const title = 'Ssst! Ada Postingan Baru di Trending! 🔥'
    const description = `Kabar seru! Ada yang langsung meroket ke halaman trending. Cek sekarang dan lihat apa yang lagi hype!`;

    return {
      user_id: send_to,
      title: title,
      short_description: description,
      image: '', //sample image
      deeplink: `mmksi://mimate?page=post&id=${post_id}`,
      push_notification: true,
      group: "post"
    };
  }


  async postNotificationHighlight(member_name: string, send_to: number[], post_id:number): Promise<NotifDto> {
    const title = `${member_name} menandai postingan anda sebagai postingan utama`;

    return {
      user_id: send_to,
      title: 'Info - Mimate',
      short_description: title,
      image: '', //sample image
      deeplink: `mmksi://mimate?page=post&id=${post_id}`,
      push_notification: true,
      group:"post"
    };
  }

  async postVerifiedMemberNotification(member_name: string, send_to: number[], title: string, message: string, post_id: number, post_category: string): Promise<NotifDto> {
    const titlee = `Ada Postingan dari ${member_name} ID nih!🚗💥 `
    const short_description = `Cek postingan terbaru dari Mitsubishi Motors! Jangan sampe kelewatan~~`;

    return {
      user_id: send_to,
      title: titlee,
      short_description: short_description,
      image: '', //sample image
      deeplink: `mmksi://mimate?page=post&id=${post_id}`,
      // deeplink: `https://mitsubishimotorsid-mobileapp.com/deeplink/discover?type=detail&category=${post_category||'image'}&id=${post_id}`,
      push_notification: true,
      group:"post"
    };
  }

  async commentNotification(member_name: string, send_to: number[], post_id: number): Promise<NotifDto> {
    const title = 'Ada yang beri komentar di postingan Anda! 📲';
    const description = `${member_name} meninggalkan komentar. Lihat sekarang dan teruskan percakapan!`

    return {
      user_id: send_to,
      title: title,
      short_description: description,
      image: '', //sample image
      deeplink: `mmksi://mimate?page=post&id=${post_id}`,
      push_notification: true,
      group:"comment"
    };
  }

  async commentReplyNotification(member_name: string, send_to: number[], post_id: number) {

    const title = `Komentarmu dibalas! 💬✨`;
    const description = `${member_name} membalas komentarmu. Cek sekarang dan ikuti percakapan lebih lanjut!`
    return {
      user_id: send_to,
      title: title,
      short_description: description,
      image: '', //sample image
      deeplink: `mmksi://mimate?page=post&id=${post_id}`,
      push_notification: true,
      group:"reply"
    };

  }


  async postReactionComment(member_name: string, send_to: number[], post_id: number) {

    const title = `Komentar Anda direspon! 🎉`;
    const description = `${member_name} memberi reaksi di komentarmu. Yuk, buruan lihat!`;
    return {
      user_id: send_to,
      title: title,
      short_description: description,
      image: '', //sample image
      deeplink: `mmksi://mimate?page=post&id=${post_id}`,
      push_notification: true,
      group:"post_reaction"
    };

  }

  
  async postNotificationSpace(member_name: string, send_to: number[], space_name: string): Promise<NotifDto> {
    const title = `${member_name} baru saja membuat postingan di ${space_name}`;

    return {
      user_id: send_to,
      title: 'Info - Mimate',
      short_description: title,
      image: '', //sample image
      deeplink: 'mmksi://mimate?page=space-detail', //sam
      push_notification: false,
      group:""
    };
  }

  async postNotificationFollower(member_name: string, send_to: number[]): Promise<NotifDto> {
    const title = `${member_name} baru saja membuat postingan`;

    return {
      user_id: send_to,
      title: 'Info - Mimate',
      short_description: title,
      image: '', //sample image
      deeplink: 'mmksi://mimate?page=post-detail',
      push_notification: false,
      group:"post"
    };
  }
  


  async followerNotification(mimate_id: number, send_to: number[]): Promise<NotifDto> {
    const title = `Anda dapat Pengikut Baru! 👀`;
    const description = `Ada yang baru mengikuti akun Anda! Lihat siapa yang bergabung dengan follower!`

    return {
      user_id: send_to,
      title: title, 
      short_description: description,
      image: '', //sample image
      deeplink: `mmksi://mimate?page=followers&id=${mimate_id}`, //sam
      push_notification: true,
      group:"follow"
    };
  }
  

  async directMessageNotification(member_name: string, send_to: number[], message: string): Promise<NotifDto> {
    const title = `${member_name} baru saja mengirim pesan ke Anda`;

    return {
      user_id: send_to,
      title: 'Info - Mimate', 
      short_description: title,
      image: '', //sample image
      deeplink: 'mmksi://mimate?page=direct-message-detail', //sam
      push_notification: true,
      group:"message"
    };
  }
  
  async reactionNotification(member_name: string, send_to: number[] , post_id:number): Promise<NotifDto> {
    const title = `Postingan Anda direspon! 🎉`
    const description = `${member_name} memberi reaksi di postinganmu. Yuk, buruan lihat!`
    return {
      user_id: send_to,
      title: title, 
      short_description: description,
      image: '', //sample image
      deeplink: `mmksi://mimate?page=post&id=${post_id}`, //sam
      push_notification: true,
      group:"reaction"
    };
  }
  
  

}