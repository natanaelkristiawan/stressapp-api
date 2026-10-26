import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SendMessageDto } from './dto/dm-send.dto';
import { DirectMessageService } from './direct-message.service';
import {
  ConversationIdParamDto,
  FindOrCreateConversationDto,
} from './dto/dm-create.dto';
import {
  ChatMessageItemInterface,
  ChatRoomDetailInterface,
  ChatThreadListInterface,
  Conversation as ConversationInterface,
  GetConversationHistory,
  GetMessage,
  History as HistoryInterface,
} from './interfaces/direct-message.interface';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { DmSearchDto } from './dto/dm-search.dto';
import { QueueService } from 'src/queue/queue.service';
import {
  MemberAuthGuard,
  MemberRequest,
} from 'src/member-auth/member-auth.guard';
import { MemberAuthService } from 'src/member-auth/member-auth.service';
@Controller('direct-message')
@ApiTags('DIRECT MESSAGE')
@ApiBearerAuth('access-token')
export class DirectMessageController {
  constructor(
    private readonly messageService: DirectMessageService,
    private readonly queueService: QueueService,
  ) {}

  @Post('find-or-create/:memberId')
  @ApiOperation({
    summary: 'Find or create a one-on-one conversation between two members',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation found or created',
    example: {
      success: true,
      alert: {
        code: 201,
        message: 'Success get data',
      },
      data: {
        id: 2,
        createdAt: '2025-04-17T05:04:19.000Z',
        updatedAt: '2025-04-17T06:32:38.000Z',
        participants: [
          {
            id: 2,
            name: 'Nurafni Panjaitan',
            profilePictureUrl: null,
            isOwner: false,
          },
          {
            id: 10245,
            name: 'Abid Putra',
            profilePictureUrl: '',
            isOwner: true,
          },
        ],
      },
    },
  })
  async findOrCreateConversation(
    @Param() dto: FindOrCreateConversationDto,
    @Req() request,
  ): Promise<GlobalResponse<ConversationInterface>> {
    const { memberId } = dto;
    const { id: userId } = request.userData;

    const response = await this.messageService.findOrCreateConversation(
      userId,
      memberId,
    );

    return {
      message: 'Success get data',
      data: response,
    };
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Get message history by conversation ID' })
  @ApiParam({ name: 'conversationId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of messages in the conversation',
    example: {
      success: true,
      alert: {
        code: 200,
        message: 'Success get data',
      },
      data: [
        {
          date: '17 April 2025',
          messages: [
            {
              id: 3,
              content: 'Hello!',
              createdAt: '2025-04-17T05:36:56.000Z',
              time: '05:36:56',
              date: '17 April 2025',
              sender: {
                isOwner: true,
                id: 10245,
                name: 'Abid Putra',
                profilePictureUrl: '',
              },
            },
            {
              id: 4,
              content: 'Hello! sudahlah',
              createdAt: '2025-04-17T21:19:39.000Z',
              time: '21:19:39',
              date: '17 April 2025',
              sender: {
                isOwner: true,
                id: 10245,
                name: 'Abid Putra',
                profilePictureUrl: '',
              },
            },
          ],
        },
        {
          date: '28 April 2025',
          messages: [
            {
              id: 5,
              content: 'Hello!',
              createdAt: '2025-04-28T04:10:04.000Z',
              time: '04:10:04',
              date: '28 April 2025',
              sender: {
                isOwner: true,
                id: 10245,
                name: 'Abid Putra',
                profilePictureUrl: '',
              },
            },
            {
              id: 6,
              content: 'Hello!',
              createdAt: '2025-04-28T04:10:36.000Z',
              time: '04:10:36',
              date: '28 April 2025',
              sender: {
                isOwner: true,
                id: 10245,
                name: 'Abid Putra',
                profilePictureUrl: '',
              },
            },
          ],
        },
      ],
    },
  })
  async getMessages(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() request,
  ): Promise<GlobalResponse<GetConversationHistory>> {
    const { id: userId } = request.userData;

    await this.messageService.markMessagesAsRead(conversationId, userId);

    const response = await this.messageService.getMessagesByConversationId(
      conversationId,
      userId,
    );

    return {
      message: 'Success get data',
      data: response,
    };
  }

  @Post(':conversationId')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    example: {
      success: true,
      alert: {
        code: 201,
        message: 'Success get data',
      },
      data: {
        id: 6,
        content: 'Hello!',
        createdAt: '2025-04-28T04:10:36.000Z',
        sender: {
          id: 10245,
          name: 'Abid Putra',
          profilePictureUrl: '',
          isOwner: true,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Conversation or sender not found' })
  async sendMessage(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Body() sendMessageDto: SendMessageDto,
    @Req() request,
  ): Promise<GlobalResponse<GetMessage>> {
    const { content } = sendMessageDto;
    const { id: userId } = request.userData;

    const response = await this.messageService.sendMessage(
      conversationId,
      userId,
      content,
    );

    // send notification to member
    await this.queueService.addJob('send-notification', {
      type: 'direct-message-notification',
      send_to: [response.sender.id],
      actor_name: response.sender.name,
      message: content,
    });

    return {
      message: 'Success get data',
      data: response,
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'List all conversations for a user' })
  @ApiResponse({
    status: 200,
    description: 'List of conversations',
    example: {
      success: true,
      alert: {
        code: 200,
        message: 'Success get data',
      },
      data: [
        {
          id: 2,
          sender: {
            id: 2,
            name: 'Nurafni Panjaitan',
            profilePictureUrl: '',
            isOwner: false,
          },
          lastMessage: 'haloo',
          lastMessageAt: '2025-05-06T01:31:36.000Z',
          time: '09:31 AM',
          date: '6 Mei 2025',
          unreadCount: 0,
        },
        {
          id: 3,
          sender: {
            id: 90828,
            name: 'selly',
            profilePictureUrl: 'https://ktb.otesuto.com/',
            isOwner: false,
          },
          lastMessage: 'yo',
          lastMessageAt: '2025-05-13T02:03:00.000Z',
          time: '10:03 AM',
          date: '13 Mei 2025',
          unreadCount: 0,
        },
      ],
    },
  })
  async getUserConversations(
    @Req() request,
    @Query() searchDto: DmSearchDto,
  ): Promise<GlobalResponse<HistoryInterface[]>> {
    const { id: userId } = request.userData;
    const { search } = searchDto;
    const response = await this.messageService.getUserConversationList(
      userId,
      search,
    );

    return {
      message: 'Success get data',
      data: response,
    };
  }

  @Delete(':conversationId')
  @ApiOperation({ summary: 'Soft delete a conversation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation soft deleted',
    example: {
      success: true,
      alert: {
        code: 200,
        message: 'Success delete data',
      },
      data: {},
    },
  })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async softDelete(
    @Param('conversationId', ParseIntPipe) id: number,
    @Req() request,
  ): Promise<{ message: string; data: object }> {
    const { id: userId } = request.userData;
    await this.messageService.softDeleteConversationById(id, userId);
    return { message: `Success delete data`, data: {} };
  }
}

@ApiTags('CHATS')
@ApiBearerAuth('access-token')
@Controller('me/chats')
@UseGuards(MemberAuthGuard)
export class MemberChatsController {
  constructor(
    private readonly messageService: DirectMessageService,
    private readonly memberAuth: MemberAuthService,
  ) {}

  /** Lists active 1-on-1 conversations for the authenticated member. */
  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'List member 1-on-1 chat threads' })
  async listChats(
    @Query() query: DmSearchDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<ChatThreadListInterface>> {
    await this.memberAuth.limit(
      'chats-list',
      String(request.member.id),
      240,
      3600,
    );
    const data = await this.messageService.listMemberChatThreads(
      request.member.id,
      query.search,
    );
    return {
      message: 'Daftar obrolan berhasil dimuat.',
      data,
    };
  }

  /** Finds or creates a 1-on-1 conversation with an accepted friend and returns room details. */
  @Post('with/:memberId')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Open or create 1-on-1 chat room with an accepted friend',
  })
  async openWithFriend(
    @Param() params: FindOrCreateConversationDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<ChatRoomDetailInterface>> {
    await this.memberAuth.limit(
      'chats-open',
      String(request.member.id),
      180,
      3600,
    );
    const data = await this.messageService.openMemberChatWithFriend(
      request.member.id,
      params.memberId,
    );
    return {
      message: 'Ruang obrolan berhasil dimuat.',
      data,
    };
  }

  /** Loads partner metadata, chronological messages, and topic cards for a conversation. */
  @Get(':conversationId')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Get 1-on-1 chat room messages and topic cards' })
  async getRoom(
    @Param() params: ConversationIdParamDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<ChatRoomDetailInterface>> {
    await this.memberAuth.limit(
      'chats-room',
      String(request.member.id),
      600,
      3600,
    );
    const data = await this.messageService.getMemberChatRoom(
      request.member.id,
      params.conversationId,
    );
    return {
      message: 'Pesan obrolan berhasil dimuat.',
      data,
    };
  }

  /** Sends a text message inside an active 1-on-1 conversation between accepted friends. */
  @Post(':conversationId/messages')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Send a text message in a 1-on-1 chat room' })
  async sendMessage(
    @Param() params: ConversationIdParamDto,
    @Body() dto: SendMessageDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<ChatMessageItemInterface>> {
    await this.memberAuth.limit(
      'chats-send',
      String(request.member.id),
      240,
      3600,
    );
    const data = await this.messageService.sendMemberChatMessage(
      request.member.id,
      params.conversationId,
      dto.content,
    );
    return {
      message: 'Pesan berhasil dikirim.',
      data,
    };
  }

  /** Soft-deletes a conversation for the authenticated participant. */
  @Delete(':conversationId')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Soft delete a 1-on-1 conversation' })
  async deleteConversation(
    @Param() params: ConversationIdParamDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<{ conversationId: number; deleted: boolean }>> {
    await this.memberAuth.limit(
      'chats-delete',
      String(request.member.id),
      60,
      3600,
    );
    await this.messageService.softDeleteConversationById(
      params.conversationId,
      request.member.id,
    );
    return {
      message: 'Obrolan berhasil dihapus.',
      data: {
        conversationId: params.conversationId,
        deleted: true,
      },
    };
  }
}
