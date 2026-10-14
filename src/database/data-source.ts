import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

import { UserMimateEntity } from '../entity/user-mimate.entity';
import { PostEntity } from '../entity/post.entity';
import { TagsEntity } from '../entity/tags.entity';
import { PostTagsEntity } from '../entity/post-tags.entity';
import { AssetsEntity } from '../entity/asset.entity';
import { SpaceEntity } from '../entity/space.entity';
import { ReactionEntity } from '../entity/reaction.entity';
import { MemberSpaceEntity } from '../entity/member-spaces.entity';
import { Conversation } from '../entity/convertation.entity';
import { Message } from '../entity/message.entity';
import { UserFollowEntity } from '../entity/user-follow.entity';
import { CommentEntity } from '../entity/comment.entity';
import { PostReport } from '../entity/post-report.entity';
import { Activity } from '../entity/activity.entity';
import { CommentReactionEntity } from '../entity/comment-reaction.entity';
import { RequestLogEntity } from '../entity/log.entity';
import { Quest } from '../entity/quest.entity';
import { QuestDetail } from '../entity/quest-detail.entity';
import { QuestPoint } from '../entity/quest-point.entity';
import { QuestPointDetail } from '../entity/quest-point-detail.entity';
import { UserAdmin } from '../entity/user-admin.entity';
import { Highlight } from '../entity/highlights.entity';
import { Visitor } from '../entity/visitor.entity';
import { VoteEntity } from '../entity/vote.entity';
import { VoteMemberEntity } from '../entity/vote-member.entity';
import { QuestBackup } from '../entity/quest-backup.entity';

dotenv.config();

export const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE_MIMATE,
    entities: ['src/entity/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
});
