import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quest } from 'src/entity/quest.entity';
import { QuestDetail } from 'src/entity/quest-detail.entity';
import { CreatedQuestDto } from './dtos/quest.dto';
import { QuestInterface } from './interfaces/quest.interface';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
@Injectable()
export class AdminQuestService {

    constructor(
        @InjectRepository(Quest, 'mimate')
        private readonly questRepo: Repository<Quest>,
        @InjectRepository(QuestDetail, 'mimate')
        private readonly questDetailRepo: Repository<QuestDetail>,
        @InjectRepository(UserMimateEntity, 'mimate')
        private readonly userMimateRepo: Repository<UserMimateEntity>,
    ) {}


    // using DTO for create quest   
    // async createQuest(quest: CreatedQuestDto, userId: number): Promise<QuestInterface> {

    //     // get user data
    //     const user = await this.userMimateRepo.findOne({where: {id: userId}});

    //     // collect quest data
    //     const questData = {
    //         title: quest.title,
    //         image: quest.image,
    //         description: quest.description,
    //         condition: quest.condition,
    //         action: quest.action,
    //         interval: quest.interval,
    //         dateStart: quest.dateStart,
    //         dateEnd: quest.dateEnd, 
    //         status: quest.status,
    //         createdBy: user,
    //     }

    //     // create quest
    //     const query = await this.questRepo.create(questData);       
    //     const result = await this.questRepo.save(query);

    //     // create quest detail
    //     const questDetailData = quest.questDetails.map(detail => ({
    //         ...detail,
    //         target: JSON.stringify(detail.target),
    //         quest: result,
    //     }));

    //     // save quest detail
    //     const questDetailResult = await this.questDetailRepo.save(questDetailData);

    //     // create response as quest interface
    //     const response: QuestInterface = {
    //         id: result.id,
    //         image: result.image,
    //         title: result.title,
    //         description: result.description,
    //         condition: result.condition,
    //         action: result.action,
    //         interval: result.interval,
    //         dateStart: result.dateStart,
    //         dateEnd: result.dateEnd,
    //         status: result.status,
    //         questDetails: questDetailResult,
    //     }

    //     return response;
    // }


    // get all quest
    async getAllQuest(): Promise<QuestInterface[]> {
        const data = await this.questRepo.find({
            where: {isMain: 1}
        });

        return data.map((item) => ({
            id: item.id,
            title: item.title,
            point: item.point,
            status: item.status,
        }));
    }

    // on off status quest
    async onOffStatusQuest(id: number, status: number): Promise<boolean> {
        const data = await this.questRepo.update(id, {status: status});
        return data.affected > 0 ? true : false;
    }
}