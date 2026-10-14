import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quest } from 'src/entity/quest.entity';

@Injectable()
export class SeedService {
    constructor(
        @InjectRepository(Quest, 'mimate')
        private readonly questRepo: Repository<Quest>,
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

        console.log('Seeding finished.');
    }
}

