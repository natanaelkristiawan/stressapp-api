import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter';

@Module({
    imports: [
        MailerModule.forRootAsync({
            useFactory: () => ({
                transport: {
                    host: process.env.EMAIL_HOST,
                    port: parseInt(process.env.EMAIL_PORT),
                    auth: {
                        user: process.env.EMAIL_USERNAME,
                        pass: process.env.EMAIL_PASSWORD
                    },
                    /* secure: false,
                    tls: {
                        rejectUnauthorized: false,
                    }, */
                },
                defaults: {
                    from: process.env.EMAIL_FROM,                    
                },
                template: {
                    dir: __dirname + '/../../templates',
                    adapter: new PugAdapter(),
                    options: {
                        strict: true,
                    },
                },
            }),
        }),        
    ],
    controllers: [MailController],
    providers: [MailService]
})
export class MailModule {}
