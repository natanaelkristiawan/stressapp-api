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
                    // Match the app-level transport: port 465 requires implicit TLS.
                    secure: process.env.EMAIL_SECURE === 'true',
                    connectionTimeout: 10000,
                    socketTimeout: 10000,
                    auth: {
                        user: process.env.EMAIL_USERNAME,
                        pass: process.env.EMAIL_PASSWORD
                    },
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
