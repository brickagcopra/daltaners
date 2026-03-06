import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageQueryDto, ConversationQueryDto } from './dto/message-query.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ─── Conversations ──────────────────────────────────────────

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  async createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.chatService.createConversation(dto, user.id, user.role);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get my conversations' })
  async getConversations(
    @Query() query: ConversationQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.getConversations(userId, query);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a conversation by ID' })
  async getConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.getConversation(id, userId);
  }

  @Get('conversations/order/:orderId')
  @ApiOperation({ summary: 'Get conversation for an order' })
  async getConversationByOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.getConversationByOrderId(orderId, userId);
  }

  @Post('conversations/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a conversation' })
  async closeConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    await this.chatService.closeConversation(id, user.id, user.role);
    return { message: 'Conversation closed' };
  }

  // ─── Messages ───────────────────────────────────────────────

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  async sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.chatService.sendMessage(id, dto, user.id, user.role);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  async getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MessageQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.getMessages(id, userId, query);
  }

  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark messages as read' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { message_ids: string[] },
    @CurrentUser('id') userId: string,
  ) {
    await this.chatService.markAsRead(id, userId, body.message_ids || []);
    return { message: 'Messages marked as read' };
  }

  // ─── Presence ───────────────────────────────────────────────

  @Get('conversations/:id/online')
  @ApiOperation({ summary: 'Get online participants in a conversation' })
  async getOnlineParticipants(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.getOnlineParticipants(id);
  }
}
