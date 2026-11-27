import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { ConversationCardsController } from './conversation-cards.controller';
import { ConversationCardsService } from './conversation-cards.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [ConversationCardsController],
  providers: [ConversationCardsService, CmsMembersGuard],
  exports: [ConversationCardsService],
})
export class ConversationCardsModule {}
