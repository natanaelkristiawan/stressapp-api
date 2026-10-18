import { CmsMoodParticipationModule } from './cms-mood-participation/cms-mood-participation.module';
import { MoodTrackerModule } from './mood-tracker/mood-tracker.module';
import { getCorsOptions } from './common/config/cors';
import { MemberAuthModule } from './member-auth/member-auth.module';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SuccessInterceptor } from './common/interceptors/success.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as basicAuth from 'express-basic-auth';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { ActivityModule } from './activity/activity.module';
import { QueueModule } from './queue/queue.module';
import { PostModule } from './post/post.module';
import { SpaceModule } from './space/space.module';
import { UploadModule } from './upload/upload.module';
import { ProfileModule } from './profile/profile.module';
import { DirectMessageModule } from './direct-message/direct-message.module';
import { CommentModule } from './comment/comment.module';
import { PostReportModule } from './post-report/post-report.module';
import { ReactionModule } from './reaction/reaction.module';
import { CommonModule } from './common/common.module';
import { SearchModule } from './search/search.module';
import { NullToEmptyInterceptor } from './common/interceptors/null-to-empty.interceptor';
import { CommentReactionModule } from './comment-reaction/comment-reaction.module';
import { AdminUserModule } from './admin-user/admin-user.module';
import { AdminQuestModule } from './admin-quest/admin-quest.module';
import { QuestModule } from './quest/quest.module';
import { AdminStaffModule } from './admin-staff/admin-staff.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { HighlightModule } from './highlight/highlight.module';
import { AdminPostModule } from './admin-post/admin-post.module';
import { AdminTagModule } from './admin-tag/admin-tag.module';
import { AdminSpaceModule } from './admin-space/admin-space.module';
import { TagModule } from './tag/tag.module';
import { MemberVoteModule } from './member-vote/member-vote.module';
import { AdminHighlightModule } from './admin-highlight/admin-highlight.module';
import { AdminPostTrendingModule } from './admin-post-trending/admin-post-trending.module';
import { AdminPostReportModule } from './admin-post-report/admin-post-report.module';
import { CaptureBsiModule } from './capture-bsi/capture-bsi.module';
import { WinnerModule } from './winner/winner.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Apply success response wrapper
  app.useGlobalInterceptors(new SuccessInterceptor(), new NullToEmptyInterceptor());

  app.enableCors(getCorsOptions(process.env.CORS_ORIGINS));


  // Apply error response wrapper
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );


  app.use(
    ['/documentation', '/admin-documentation'], // Adjust the paths if needed
    basicAuth({
      challenge: true,
      users: {
        'ktb': 'ktb2025!', // Change credentials here
      },
    }),
  );


  app.use(
    ['/bsi-documentation'], // Adjust the paths if needed
    basicAuth({
      challenge: true,
      users: {
        'bsi': 'bsi2025', // Change credentials here
      },
    }),
  );


  // swagger
  const config = new DocumentBuilder()
  .setTitle('Mimate Documentation')
  .setDescription('Mimate Documentation provides clear and concise guides, references, and examples to help users effectively understand, use, and integrate Mimate’s features and services.<br/> <strong>All endpoints require a Bearer token.  Click "Authorize" and enter your token in the format: Bearer YourToken</strong>')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT', // optional, can be 'JWT' or 'Token'
      name: 'Authorization',
      in: 'header',
    },
    'access-token', // This is the name you will refer to in @ApiBearerAuth()
  )
  .build();
  
  const documentFactory = () => SwaggerModule.createDocument(app, config, {
    include: [
      MemberAuthModule,
      MoodTrackerModule,
      PostModule,
      SpaceModule,
      UploadModule,
      ProfileModule,
      DirectMessageModule,
      CommentModule,
      ReactionModule,
      PostReportModule,
      MemberVoteModule,
      CommonModule,
      SearchModule,
      ActivityModule,
      QueueModule,
      CommentReactionModule,
      QuestModule,
      HighlightModule,
      TagModule,
      WinnerModule,
      AppModule
    ]
  });
  SwaggerModule.setup('documentation', app, documentFactory);


  // Admin Swagger Config
  const adminConfig = new DocumentBuilder()
    .setTitle('Mimate Admin API')
    .setDescription(
      'Admin endpoints for Mimate.<br/> <strong>All endpoints require a Bearer token.  Click "Authorize" and enter your token in the format: Bearer YourToken</strong>',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();

  const adminDoc = SwaggerModule.createDocument(app, adminConfig, {
    include: [
      CmsMoodParticipationModule,
      AdminDashboardModule, 
      AdminUserModule, 
      AdminQuestModule, 
      AdminStaffModule, 
      AdminAuthModule,
      AdminPostModule,
      AdminTagModule,
      AdminSpaceModule,
      AdminHighlightModule,
      AdminPostTrendingModule,
      AdminPostReportModule,
      ActivityModule
    ]
  });
  SwaggerModule.setup('admin-documentation', app, adminDoc);



  const bsiConfig = new DocumentBuilder()
    .setTitle('Mimate BSI API')
    .setDescription(
      'Admin endpoints for Mimate.<br/><strong>All endpoints require Basic Auth.</strong><br/>Click "Authorize" and enter your username and password.',
    )
    .setVersion('1.0')
    .addBasicAuth(
      {
        type: 'http',
        scheme: 'basic',
        in: 'header',
        name: 'Authorization',
        description: 'Use your admin username and password',
      },
      'basic-auth',
    )
    .build();

  // Generate the Swagger document
  const bsiDoc = SwaggerModule.createDocument(app, bsiConfig, {
    include: [CaptureBsiModule],
  });

  // Serve it at /admin-bsi
  SwaggerModule.setup('bsi-documentation', app, bsiDoc, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Mimate BSI Admin API',
  });


    
  await app.listen(process.env.PORT ?? 3111);
}
bootstrap();
