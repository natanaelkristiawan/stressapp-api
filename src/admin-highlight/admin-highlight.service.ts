import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Highlight } from '../entity/highlights.entity';
import { HighlightCreateDto, HighlightUpdateOrderDto } from './dtos/admin-highlight.dto';
import { HighlightInterface } from './interfaces/admin-highlight.interface';

@Injectable()
export class AdminHighlightService {
    constructor(
        @InjectRepository(Highlight, 'mimate')
        private readonly highlightRepository: Repository<Highlight>
    ){}

    // list highlight
    async listHighlight(): Promise<HighlightInterface[]> {
        return this.highlightRepository.find()
    }

    async createHighlight(highlightCreateDto: HighlightCreateDto): Promise<HighlightInterface> {
        //  split variable from dto
        const { name, image, order, link, need_token } = highlightCreateDto;

        let data = new Highlight()
        data.name = name
        data.image = image
        data.order = order
        data.link = link
        data.need_token = need_token ?? 0
        data.createdAt = new Date()
        data.updatedAt = new Date()

        return this.highlightRepository.save(data)  
    }

    async updateHighlight(id: number, highlightCreateDto: HighlightCreateDto): Promise<HighlightInterface> {
        const { name, image, order, link, need_token } = highlightCreateDto;

        let data = await this.highlightRepository.findOneBy({id})
        data.name = name
        data.image = image
        data.order = order
        data.link = link
        if (need_token !== undefined) {
            data.need_token = need_token
        }
        data.updatedAt = new Date()

        return this.highlightRepository.save(data)  
    }

    async deleteHighlight(id: number): Promise<void> {
        await this.highlightRepository.delete(id)
    }

    async getHighlight(id: number): Promise<HighlightInterface> {
        return this.highlightRepository.findOneBy({id})
    }

    async updateOrderAllHighlight(highlightUpdateOrderDto: HighlightUpdateOrderDto): Promise<HighlightInterface[]> {
        let data = await this.highlightRepository.find()
        for (const item of highlightUpdateOrderDto.order) {
            let highlight = data.find(h => h.id === item.id)
            highlight.order = item.order
        }
        return this.highlightRepository.save(data)
    }
    
}
