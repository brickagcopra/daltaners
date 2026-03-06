import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'development'
      ? true
      : (process.env.CORS_ORIGINS || '').split(','),
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(private readonly chatService: ChatService) {}

  afterInit(_server: Server) {
    this.logger.log('Chat Gateway initialized');
  }

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    if (client.userId) {
      const sockets = this.connectedUsers.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.connectedUsers.delete(client.userId);
          await this.chatService.setOffline(client.userId);
        }
      }
    }
  }

  // ─── Client Events ──────────────────────────────────────────

  @SubscribeMessage('authenticate')
  async handleAuthenticate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { userId: string; role?: string },
  ) {
    client.userId = payload.userId;
    client.userRole = payload.role;
    client.join(`user:${payload.userId}`);

    // Track multi-device connections
    if (!this.connectedUsers.has(payload.userId)) {
      this.connectedUsers.set(payload.userId, new Set());
    }
    this.connectedUsers.get(payload.userId)!.add(client.id);

    await this.chatService.setOnline(payload.userId);

    this.logger.log(`User ${payload.userId} authenticated on socket ${client.id}`);
    return { event: 'authenticated', data: { userId: payload.userId } };
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversation_id: string },
  ) {
    if (!client.userId) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    const room = `conversation:${payload.conversation_id}`;
    client.join(room);

    this.logger.log(`User ${client.userId} joined ${room}`);
    return { event: 'joined_conversation', data: { conversation_id: payload.conversation_id } };
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversation_id: string },
  ) {
    const room = `conversation:${payload.conversation_id}`;
    client.leave(room);
    return { event: 'left_conversation', data: { conversation_id: payload.conversation_id } };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: {
      conversation_id: string;
      message_type: string;
      content: string;
      media_url?: string;
    },
  ) {
    if (!client.userId || !client.userRole) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    try {
      const message = await this.chatService.sendMessage(
        payload.conversation_id,
        {
          message_type: payload.message_type,
          content: payload.content,
          media_url: payload.media_url,
        },
        client.userId,
        client.userRole,
      );

      // Broadcast to all participants in the conversation room
      this.server
        .to(`conversation:${payload.conversation_id}`)
        .emit('new_message', {
          ...message,
          timestamp: new Date().toISOString(),
        });

      return { event: 'message_sent', data: message };
    } catch (error) {
      return {
        event: 'error',
        data: { message: (error as Error).message },
      };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversation_id: string; is_typing: boolean },
  ) {
    if (!client.userId) return;

    await this.chatService.setTyping(
      payload.conversation_id,
      client.userId,
      payload.is_typing,
    );

    // Broadcast typing indicator to other participants
    client
      .to(`conversation:${payload.conversation_id}`)
      .emit('typing_indicator', {
        conversation_id: payload.conversation_id,
        user_id: client.userId,
        is_typing: payload.is_typing,
        timestamp: new Date().toISOString(),
      });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversation_id: string; message_ids: string[] },
  ) {
    if (!client.userId) return;

    try {
      await this.chatService.markAsRead(
        payload.conversation_id,
        client.userId,
        payload.message_ids,
      );

      // Notify other participants of read receipts
      client
        .to(`conversation:${payload.conversation_id}`)
        .emit('messages_read', {
          conversation_id: payload.conversation_id,
          user_id: client.userId,
          message_ids: payload.message_ids,
          timestamp: new Date().toISOString(),
        });

      return { event: 'marked_read', data: { message_ids: payload.message_ids } };
    } catch (error) {
      return { event: 'error', data: { message: (error as Error).message } };
    }
  }

  // ─── Server-side Emit Methods ───────────────────────────────

  emitToConversation(conversationId: string, event: string, data: Record<string, unknown>): void {
    this.server.to(`conversation:${conversationId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  emitToUser(userId: string, event: string, data: Record<string, unknown>): void {
    this.server.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}
