import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { MarkAsReadDto, NotificationDto } from './dto/activity.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { NotificationCollectionResponse } from './interfaces/notification.intrface';

@ApiTags('Activity')
@ApiBearerAuth('access-token')
@Controller('activity')
export class ActivityController {

    constructor(private readonly activityService: ActivityService) {}

    @Get('notification')
    async getNotification(@Query() dto: NotificationDto, @Req() request: any):Promise<GlobalResponse<NotificationCollectionResponse>> {
        const {id:userId} = request.userData
        const {after, limit} = dto
        return {
            message: 'Success get data',
            data: await this.activityService.getNotif(after, limit, userId)
        }
    }

    @Post('notification/mark-as-read')
    async markAsRead(@Body() dto: MarkAsReadDto): Promise<GlobalResponse<boolean>> {
        return {
            message: 'Success mark as read',
            data: await this.activityService.markAsRead(dto.id)
        }
    }

}
