import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {

    constructor(private readonly mailerService: MailerService) {}

    async send(params: {
        to: string[],
        subject: string,
        template: string,
        context: ISendMailOptions['context']
    })
    {
        try {
            const sendMailParams = {
                to: params.to,
                from: process.env.EMAIL_FROM_ADDRESS,
                subject: params.subject,
                template: params.template,
                context: params.context,
            };
            const response = await this.mailerService.sendMail(sendMailParams);
        } catch(error) {
            console.error(error);
        }
    }

}
