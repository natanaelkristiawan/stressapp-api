import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Highlight } from 'src/entity/highlights.entity';
import {
    Highlight as HighlightInterface,
    HighlightV2 as HighlightV2Interface,
} from './interfaces/highlight.interface';
import { GetHighlightDto } from './dtos/get-highlight.dto';

@Injectable()
export class HighlightService {

    constructor(    
    // entity highlight
        @InjectRepository(Highlight, 'mimate')
        private highlightRepository: Repository<Highlight>,
    ) {}

    // get all highlight
    async getAllHighlight(dto?: GetHighlightDto): Promise<HighlightInterface[]> {
        let data = await this.highlightRepository.find({
            order: {
                order: 'ASC',
            },
            ...(dto?.limit ? { take: dto.limit } : {}),
        });

        // collect data
        const items = data.map((item) => ({
            id: item.id,
            name: item.name,
            image: item.image,
            order: item.order,
            link: item.link,
        }));

        // return data
        return items;
    }

    private appendTokenToLink(link: string | null | undefined, token: string): string {
        if (!link) return '';
        if (!token) return link;

        if (/([?&])token=/.test(link)) {
            return link.replace(/([?&])token=[^&]*/, `$1token=${token}`);
        }

        const separator = link.includes('?')
            ? (link.endsWith('?') || link.endsWith('&') ? '' : '&')
            : '?';

        return `${link}${separator}token=${token}`;
    }

    // get all highlight v2
    async getAllHighlightV2(dto?: GetHighlightDto, token?: string): Promise<HighlightV2Interface[]> {
        let data = await this.highlightRepository.find({
            order: {
                order: 'ASC',
            },
            ...(dto?.limit ? { take: dto.limit } : {}),
        });

        // collect data
        const items = data.map((item) => {
            const file = item.image ?? '';
            const lowerFile = file.toLowerCase();
            const isLottie =
                lowerFile.endsWith('.json') ||
                lowerFile.endsWith('.lottie') ||
                lowerFile.includes('/lotties/');

            const isNeedToken = Boolean(item.need_token);
            let link = item.link ?? '';

            if (isNeedToken && token) {
                link = this.appendTokenToLink(link, token);
            }

            return {
                id: item.id,
                name: item.name,
                file: file,
                type: (isLottie ? 'lottie' : 'image') as 'image' | 'lottie',
                order: item.order,
                link: link,
                need_token: item.need_token ?? 0,
            };
        });

        // return data
        return items;
    }
}

