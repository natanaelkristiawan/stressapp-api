import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quest } from 'src/entity/quest.entity';
import { NotificationTemplate } from 'src/entity/notification-template.entity';
import { DEFAULT_NOTIFICATION_TEMPLATES } from './notification-template.seed';

@Injectable()
export class SeedService {
    constructor(
        @InjectRepository(Quest, 'mimate')
        private readonly questRepo: Repository<Quest>,
        @InjectRepository(NotificationTemplate, 'mimate')
        private readonly templateRepo: Repository<NotificationTemplate>,
    ) { }

    async run() {
        console.log('Seeding started...');

        const sampleQuests: Partial<Quest>[] = [
            {
                title: 'Create post olympic Campign',
                description: 'Share your thoughts, photos, or updates with the community.',
                image: '',
                action: 'olympic_create_post',
                condition: 'single',
                interval: 'daily',
                point: 50,
                status: 1,
                isMain: 1,
                dateStart: null,
                dateEnd: null,
            },

            {
                title: 'Create comment olympic Campign',
                description: 'Share your thoughts, photos, or updates with the community.',
                image: '',
                action: 'olympic_create_comment',
                condition: 'single',
                interval: 'daily',
                point: 10,
                status: 1,
                isMain: 1,
                dateStart: null,
                dateEnd: null,
            },


            {
                title: 'Create reaction olympic Campign',
                description: 'Share your thoughts, photos, or updates with the community.',
                image: '',
                action: 'olympic_create_reaction',
                condition: 'single',
                interval: 'daily',
                point: 10,
                status: 1,
                isMain: 1,
                dateStart: null,
                dateEnd: null,
            },


        ];

        // ponytail: idempotent upsert by action key to avoid duplicate seeds
        for (const data of sampleQuests) {
            const exists = await this.questRepo.findOne({ where: { action: data.action } });
            if (!exists) {
                await this.questRepo.save(this.questRepo.create(data));
                console.log(`[+] Seeded quest: ${data.title} (${data.action})`);
            } else {
                console.log(`[-] Quest already exists, skipped: ${data.action}`);
            }
        }

        // Seed automatic notification templates idempotently
        for (const item of DEFAULT_NOTIFICATION_TEMPLATES) {
            const existing = await this.templateRepo.findOne({ where: { type: item.type } });
            if (!existing) {
                await this.templateRepo.save(this.templateRepo.create({
                    type: item.type,
                    title: item.title,
                    body: item.body,
                    revision: 1,
                }));
                console.log(`[+] Seeded notification template: ${item.type}`);
            } else if (!existing.title?.trim() || !existing.body?.trim()) {
                existing.title = item.title;
                existing.body = item.body;
                existing.revision = (existing.revision || 0) + 1;
                await this.templateRepo.save(existing);
                console.log(`[*] Updated empty notification template: ${item.type}`);
            } else {
                console.log(`[-] Notification template already configured: ${item.type}`);
            }
        }

        console.log('Seeding finished.');
    }
}

