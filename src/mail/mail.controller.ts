import { Controller, Post } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {

    constructor(private readonly mailService: MailService) {}

    async send() 
    {
        const params = {
            to: ['mail'],
            subject: 'Post list',
            template: 'cms-download',
            context: {
                title: 'Reporting',
                link: 'https://google.com',
            }
        };
        this.mailService.send(params);
    }

}
