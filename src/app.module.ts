import { Interest } from './entity/interest.entity';
import { InterestsModule } from './interests/interests.module';
import { PsychologistLocation } from './entity/psychologist-location.entity';
import { PsychologistsModule } from './psychologists/psychologists.module';
import { BreathingExercise } from './entity/breathing-exercise.entity';
import { BreathingPage } from './entity/breathing-page.entity';
import { BreathingSession } from './entity/breathing-session.entity';
import { BreathingModule } from './breathing/breathing.module';
import { PushDevicesModule } from './push-devices/push-devices.module';
import { MemberPushDevice } from './entity/member-push-device.entity';
import { AssessmentModule } from './assessment/assessment.module';
import { AssessmentVersion } from './entity/assessment-version.entity';
import { AssessmentSettings } from './entity/assessment-settings.entity';
import { MemberAssessment } from './entity/member-assessment.entity';
import { CmsMoodParticipationModule } from './cms-mood-participation/cms-mood-participation.module';
import { MoodTrackerModule } from './mood-tracker/mood-tracker.module';
import { MoodEntryEntity } from './entity/mood-entry.entity';
import { CmsMembersModule } from './cms-members/cms-members.module';
import { MemberAuthModule } from './member-auth/member-auth.module';
import { Member } from './entity/user-mimate.entity';
import { MemberOtp } from './entity/member-otp.entity';
import { MemberSession } from './entity/member-session.entity';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { JwtModule } from '@nestjs/jwt';
import { RedisTokenMiddleware } from './middleware/redis-token.middleware';
import { UserMimateEntity } from './entity/user-mimate.entity';
import { PostModule } from './post/post.module';
import { PostEntity } from './entity/post.entity';
import { TagsEntity } from './entity/tags.entity';
import { PostTagsEntity } from './entity/post-tags.entity';
import { AssetsEntity } from './entity/asset.entity';
import { SpaceEntity } from './entity/space.entity';
import { ReactionEntity } from './entity/reaction.entity';
import { SpaceModule } from './space/space.module';
import { MemberSpaceEntity } from './entity/member-spaces.entity';
import { UploadModule } from './upload/upload.module';
import { ProfileModule } from './profile/profile.module';
import { DirectMessageModule } from './direct-message/direct-message.module';
import { MemberForumModule } from './member-forum/member-forum.module';
import { Conversation } from './entity/convertation.entity';
import { Message } from './entity/message.entity';
import { UserFollowEntity } from './entity/user-follow.entity';
import { CommentModule } from './comment/comment.module';
import { CommentEntity } from './entity/comment.entity';
import { ReactionModule } from './reaction/reaction.module';
import { PostReportModule } from './post-report/post-report.module';
import { PostReport } from './entity/post-report.entity';
import { CommonModule } from './common/common.module';
import { SearchModule } from './search/search.module';
import { ActivityModule } from './activity/activity.module';
import { ActivityMiddleware } from './middleware/activity.middleware';
import { Activity } from './entity/activity.entity';
import { BullModule } from '@nestjs/bullmq';
import { QueueModule } from './queue/queue.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { CommentReactionModule } from './comment-reaction/comment-reaction.module';
import { CommentReactionEntity } from './entity/comment-reaction.entity';
import { AdminUserModule } from './admin-user/admin-user.module';
import { RequestLogModule } from './request-log/request-log.module';
import { RequestLogEntity } from './entity/log.entity';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AdminQuestModule } from './admin-quest/admin-quest.module';
import { Quest } from './entity/quest.entity';
import { QuestDetail } from './entity/quest-detail.entity';
import { QuestModule } from './quest/quest.module';
import { QuestPoint } from './entity/quest-point.entity';
import { QuestPointDetail } from './entity/quest-point-detail.entity';
import { QuestBackup } from './entity/quest-backup.entity';
import { QuestBackupLog } from './entity/quest-backup-log.entity';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AdminPostModule } from './admin-post/admin-post.module';
import { AdminTagModule } from './admin-tag/admin-tag.module';
import { AdminSpaceModule } from './admin-space/admin-space.module';
import { AdminStaffModule } from './admin-staff/admin-staff.module';
import { UserAdmin } from './entity/user-admin.entity';
import { Highlight } from './entity/highlights.entity';
import { HighlightModule } from './highlight/highlight.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailModule } from './mail/mail.module';
import { TagModule } from './tag/tag.module';
import { AdminHighlightModule } from './admin-highlight/admin-highlight.module';
import { AdminPostTrendingModule } from './admin-post-trending/admin-post-trending.module';
import { AdminPostReportModule } from './admin-post-report/admin-post-report.module';
import { MoengageModule } from './moengage/moengage.module';
import { Visitor } from './entity/visitor.entity';
import { VoteEntity } from './entity/vote.entity';
import { VoteMemberEntity } from './entity/vote-member.entity';
import { MemberVoteModule } from './member-vote/member-vote.module';
import { AdminSettingModule } from './admin-setting/admin-setting.module';
import { SettingEntity } from './entity/setting.entity';
import { LogLastActiveManual } from './entity/log-last-active-manual.entity';
import { HofList } from './entity/hof-list.entity';
import { CampaignWinner } from './entity/campaign-winner.entity';
import { WinnerModule } from './winner/winner.module';
import { HofModule } from './hof/hof.module';
import { CronModule } from './cron/cron.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true
    }),
    TypeOrmModule.forRoot({
      name: 'mimate',
      type: 'mysql',
      timezone: 'Z',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE_MIMATE,
      entities: [Interest, PsychologistLocation, BreathingExercise, BreathingPage, BreathingSession, MemberPushDevice, AssessmentVersion, AssessmentSettings, MemberAssessment, MoodEntryEntity, Member, MemberOtp, MemberSession, PostEntity, TagsEntity, PostTagsEntity, AssetsEntity,
        SpaceEntity, ReactionEntity, MemberSpaceEntity, Conversation, Message, UserFollowEntity,
        CommentEntity, PostReport, Activity, CommentReactionEntity, RequestLogEntity, Quest, QuestDetail, QuestPoint, QuestPointDetail, UserAdmin, Highlight, Visitor, VoteEntity, VoteMemberEntity, QuestBackup, QuestBackupLog, SettingEntity, LogLastActiveManual, HofList, CampaignWinner], // Your entities
      synchronize: true, // User-approved development schema synchronization

    }),

    BullModule.forRoot({
      connection: {
        host: process.env.BULL_HOST,
        port: parseInt(process.env.BULL_PORT),
        // Credentials apply to queue connections as well as the shared Redis client.
        password: process.env.BULL_PASSWORD || undefined,
        username: process.env.BULL_USERNAME || undefined,
        ...(process.env.BULL_TLS === 'true' ? {
          tls: {
            // ignore ssl
            rejectUnauthorized: false
          },
          showFriendlyErrorStack: true,
          reconnectOnError: () => {
            return false
          },
        } : {}),
      },
    }),

    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60s' },
    }),

    MailerModule.forRoot({
      transport: {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE === 'true',
        connectionTimeout: 10000,
        socketTimeout: 10000,
        ...(process.env.EMAIL_USERNAME ? { auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        } } : {})
      }
    }),

    PushDevicesModule,
    AssessmentModule,
    MemberAuthModule,
    MoodTrackerModule,
    AuthModule,
    PostModule,
    SpaceModule,
    UploadModule,
    ProfileModule,
    DirectMessageModule,
    MemberForumModule,
    CommentModule,
    ReactionModule,
    PostReportModule,
    CommonModule,
    SearchModule,
    ActivityModule,
    QueueModule,
    AdminDashboardModule,
    CommentReactionModule,
    AdminUserModule,
    CmsMembersModule,
    InterestsModule,
    CmsMoodParticipationModule,
    RequestLogModule,
    AdminQuestModule,
    QuestModule,
    AdminAuthModule,
    AdminPostModule,
    AdminTagModule,
    AdminSpaceModule,
    AdminStaffModule,
    HighlightModule,
    MailModule,
    TagModule,
    AdminHighlightModule,
    AdminPostTrendingModule,
    AdminPostReportModule,
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('BULL_HOST');
        const port = parseInt(configService.get<string>('BULL_PORT') || '6379');
        const useTls = configService.get<string>('BULL_TLS') === 'true';

        return {
          config: {
            host,
            port,
            name: 'default',
            // Supports requirepass and optional Redis ACL usernames.
            password: configService.get<string>('BULL_PASSWORD') || undefined,
            username: configService.get<string>('BULL_USERNAME') || undefined,
            ...(useTls
              ? {
                tls: {
                  rejectUnauthorized: false,
                },
              }
              : {}),
            showFriendlyErrorStack: true,
            reconnectOnError: () => {
              return false;
            },
          },
        };
      },

    }),
    PsychologistsModule,
    BreathingModule,
    MoengageModule,
    MemberVoteModule,
    AdminSettingModule,
    WinnerModule,
    HofModule,
    CronModule,

  ],
  controllers: [AppController],
  providers: [AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {
  constructor(private readonly configService: ConfigService) {
  }
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RedisTokenMiddleware)
      .exclude(
        { path: 'member-auth/(.*)', method: RequestMethod.ALL },
        { path: 'me/psychologists', method: RequestMethod.ALL },
        { path: 'me/psychologists/(.*)', method: RequestMethod.ALL },
        { path: 'me/breathing', method: RequestMethod.ALL },
        { path: 'me/breathing/(.*)', method: RequestMethod.ALL },
        { path: 'me/psychoeducation', method: RequestMethod.ALL },
        { path: 'me/psychoeducation/(.*)', method: RequestMethod.ALL },
        { path: 'me/moods', method: RequestMethod.ALL },
        { path: 'me/moods/(.*)', method: RequestMethod.ALL },
        { path: 'me/mood-summary', method: RequestMethod.ALL },
        { path: 'me/push-devices', method: RequestMethod.ALL },
        { path: 'me/push-devices/(.*)', method: RequestMethod.ALL },
        { path: 'me/assessment', method: RequestMethod.ALL },
        { path: 'me/assessment/(.*)', method: RequestMethod.ALL },
        { path: 'me/friends', method: RequestMethod.ALL },
        { path: 'me/friends/(.*)', method: RequestMethod.ALL },
        { path: 'me/chats', method: RequestMethod.ALL },
        { path: 'me/chats/(.*)', method: RequestMethod.ALL },
        { path: 'me/profile', method: RequestMethod.ALL },
        { path: 'me/profile/(.*)', method: RequestMethod.ALL },
        { path: 'me/forum', method: RequestMethod.ALL },
        { path: 'me/forum/(.*)', method: RequestMethod.ALL },
        { path: 'is-live', method: RequestMethod.GET },
        { path: 'admin-auth/login', method: RequestMethod.ALL },
        { path: 'admin-auth/login/(.*)', method: RequestMethod.ALL },
        { path: 'upload/files', method: RequestMethod.ALL },
        { path: 'upload/files/:mediaId', method: RequestMethod.ALL },
        { path: 'hof/realtime/public', method: RequestMethod.GET },
        { path: 'winner', method: RequestMethod.GET },
        { path: 'winner/list', method: RequestMethod.GET },
        { path: 'winner/most-exist', method: RequestMethod.GET },
        { path: 'winner/best-newcomer', method: RequestMethod.GET },
        { path: 'winner/tampil-kembali', method: RequestMethod.GET },
        { path: 'winner/cerita-terbaik', method: RequestMethod.GET },
        { path: 'winner/check-categories/:userId', method: RequestMethod.GET },
        { path: 'winner/key/:key', method: RequestMethod.GET },
        { path: 'winner/key/(.*)', method: RequestMethod.GET },
        { path: 'cron/daily-hof', method: RequestMethod.GET },
        { path: 'cron/leaderboard-validate', method: RequestMethod.GET },
        { path: 'cron/monthly-maintenance', method: RequestMethod.GET },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    // add activity middleware  
    consumer.apply(ActivityMiddleware).exclude(
      { path: 'cms-interests', method: RequestMethod.ALL },
      { path: 'cms-interests/(.*)', method: RequestMethod.ALL },
      { path: 'cms-psychologists', method: RequestMethod.ALL },
      { path: 'cms-psychologists/(.*)', method: RequestMethod.ALL },
      { path: 'cms-breathing/(.*)', method: RequestMethod.ALL },
      { path: 'member-auth/(.*)', method: RequestMethod.ALL },
      { path: 'me/psychologists', method: RequestMethod.ALL },
        { path: 'me/psychologists/(.*)', method: RequestMethod.ALL },
        { path: 'me/breathing', method: RequestMethod.ALL },
      { path: 'me/breathing/(.*)', method: RequestMethod.ALL },
      { path: 'me/psychoeducation', method: RequestMethod.ALL },
      { path: 'me/psychoeducation/(.*)', method: RequestMethod.ALL },
      { path: 'me/moods', method: RequestMethod.ALL },
      { path: 'me/moods/(.*)', method: RequestMethod.ALL },
      { path: 'me/mood-summary', method: RequestMethod.ALL },
      { path: 'me/push-devices', method: RequestMethod.ALL },
      { path: 'me/push-devices/(.*)', method: RequestMethod.ALL },
      { path: 'me/assessment', method: RequestMethod.ALL },
      { path: 'me/assessment/(.*)', method: RequestMethod.ALL },
      { path: 'me/friends', method: RequestMethod.ALL },
      { path: 'me/friends/(.*)', method: RequestMethod.ALL },
      { path: 'me/chats', method: RequestMethod.ALL },
      { path: 'me/chats/(.*)', method: RequestMethod.ALL },
      { path: 'me/profile', method: RequestMethod.ALL },
      { path: 'me/profile/(.*)', method: RequestMethod.ALL },
      { path: 'me/forum', method: RequestMethod.ALL },
      { path: 'me/forum/(.*)', method: RequestMethod.ALL },
      { path: 'upload/image', method: RequestMethod.POST },
      { path: 'upload/audio', method: RequestMethod.POST },
      { path: 'upload/cms', method: RequestMethod.POST },
      { path: 'admin-post/psychoeducation', method: RequestMethod.ALL },
      { path: 'admin-post/psychoeducation/(.*)', method: RequestMethod.ALL },
    ).forRoutes({ path: '*', method: RequestMethod.ALL });

  }
}
