import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import {
  ConversationCardIdDto,
  ConversationCardInputDto,
  ConversationCardListDto,
  ConversationCardRevisionDto,
  UpdateConversationCardDto,
} from './conversation-cards.dto';
import { ConversationCardsService } from './conversation-cards.service';

type AdminRequest = { userData: { id: number } };

@ApiTags('CMS Chat Cards')
@ApiBearerAuth('access-token')
@UseGuards(CmsMembersGuard)
@Controller('cms-chat-cards')
export class ConversationCardsController {
  constructor(private readonly cards: ConversationCardsService) {}

  /** Returns the current card catalog and server pagination metadata. */
  @Get()
  @Header('Cache-Control', 'private, no-store')
  async list(@Query() query: ConversationCardListDto) {
    return { data: await this.cards.list(query) };
  }

  /** Returns every active card for category assignment selects. */
  @Get('options')
  @Header('Cache-Control', 'private, no-store')
  async options() {
    return { data: await this.cards.listActive() };
  }

  /** Returns one card, including inactive records. */
  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  async detail(@Param() params: ConversationCardIdDto) {
    return { data: await this.cards.detail(params.id) };
  }

  /** Creates an admin-authored card with validated fields. */
  @Post()
  async create(
    @Body() input: ConversationCardInputDto,
    @Req() request: AdminRequest,
  ) {
    return { data: await this.cards.save(input, request.userData.id) };
  }

  /** Saves a full reviewed form, rejecting stale updates. */
  @Put(':id')
  async update(
    @Param() params: ConversationCardIdDto,
    @Body() input: UpdateConversationCardDto,
    @Req() request: AdminRequest,
  ) {
    return {
      data: await this.cards.save(input, request.userData.id, params.id),
    };
  }

  /** Deactivates a reviewed card; card identities are never physically removed. */
  @Delete(':id')
  async deactivate(
    @Param() params: ConversationCardIdDto,
    @Body() input: ConversationCardRevisionDto,
    @Req() request: AdminRequest,
  ) {
    return {
      data: await this.cards.deactivate(
        params.id,
        input.revision,
        request.userData.id,
      ),
    };
  }
}
