import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Activity } from "src/entity/activity.entity";
import { PostEntity } from "src/entity/post.entity";
import { Repository } from "typeorm";
import { format } from "date-fns";
import { AdminActivityDto } from "./dtos/admin-activity.dto";

@Injectable()
export class AdminPostActivityService {

    constructor(
        @InjectRepository(Activity, 'mimate')
        private activityRepository: Repository<Activity>,
        @InjectRepository(PostEntity, 'mimate')
        private postRepository: Repository<PostEntity>,
    ) {}

    async createActivity(activityDto: AdminActivityDto): Promise<boolean> {
        const { userId, action, postId, commentId, reactionId, targetType, spaceId, source, hit_from } = activityDto;

        if (targetType !== "admin-post") {
            return false;
        }

        if (!userId || !postId || !action) {
            return false;
        }

        if (action !== "delete") {
            const post = await this.postRepository.findOne({ where: { id: postId } });
            if (!post) {
                return false;
            }
        }

        const activity: Activity = {
            userId,
            action,
            postId,
            commentId,
            reactionId,
            targetType: "post",
            createdAt: new Date(),
            source,
            hit_from,
            ...(action === "move" && spaceId != null
                ? { message: `space_id:${spaceId}` }
                : {}),
        };

        await this.activityRepository.save(activity);
        return true;
    }

    async getAdminLogsByPostId(
        postId: number,
        page: number,
        limit: number,
    ): Promise<{
        items: Array<{
            id: number;
            status: string;
            type: string;
            action: string;
            message?: string;
            createdAt: string;
        }>;
        recordsTotal: number;
        recordsFiltered: number;
    }> {
        const where = { postId, source: "admin" as const };

        const recordsTotal = await this.activityRepository.count({ where });

        const query = await this.activityRepository.find({
            where,
            relations: ["user"],
            skip: (page - 1) * limit,
            take: limit,
            order: { id: "DESC" },
        });

        const items: Array<{
            id: number;
            status: string;
            type: string;
            action: string;
            message?: string;
            createdAt: string;
        }> = [];

        for (const row of query) {
            if (row.user == null) {
                continue;
            }

            const memberName = this.getMemberName(
                row.user.name,
                row.user.mmid_fullname,
                row.user.id,
            );

            const wording = `${memberName} admin ${row.action} on post ${postId} at ${row.createdAt.toLocaleString()}`;

            items.push({
                id: row.id,
                status: wording,
                type: "admin-post",
                action: row.action,
                message: row.message ?? undefined,
                createdAt: format(row.createdAt, "dd/MM/yyyy HH:mm"),
            });
        }

        return {
            items,
            recordsTotal,
            recordsFiltered: recordsTotal,
        };
    }

    private getMemberName(name: string, mmid_fullname: string, id: number): string {
        let tempName = name;
        if (!tempName || tempName.trim() === "") {
            tempName = mmid_fullname;
        }
        if (!tempName || tempName.trim() === "") {
            tempName = `user_${String(id).padStart(4, "0")}`;
        }
        return tempName
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
    }
}