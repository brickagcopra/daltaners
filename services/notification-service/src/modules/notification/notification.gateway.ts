import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'development' ? true : (process.env.CORS_ORIGINS || '').split(','),
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

  afterInit() {
    this.logger.log('Notification WebSocket Gateway initialized');
  }

  handleConnection(client: AuthenticatedSocket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    if (userId) {
      const sockets = this.connectedUsers.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.connectedUsers.delete(userId);
        }
      }
      client.leave(`user:${userId}`);
    }
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /**
   * Client authenticates and joins their user-specific room.
   * Payload: { userId: string, role?: string }
   */
  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { userId: string; role?: string },
  ) {
    if (!payload?.userId) {
      client.emit('error', { message: 'userId is required' });
      return;
    }

    client.userId = payload.userId;
    client.userRole = payload.role;
    client.join(`user:${payload.userId}`);

    // Track connected sockets per user (multi-device support)
    if (!this.connectedUsers.has(payload.userId)) {
      this.connectedUsers.set(payload.userId, new Set());
    }
    this.connectedUsers.get(payload.userId)!.add(client.id);

    // Join role-based room for broadcasts
    if (payload.role) {
      client.join(`role:${payload.role}`);
    }

    this.logger.log(
      `User ${payload.userId} authenticated (socket: ${client.id})`,
    );

    client.emit('authenticated', { status: 'ok' });
  }

  /**
   * Client subscribes to a specific order's real-time updates.
   */
  @SubscribeMessage('subscribe_order')
  handleSubscribeOrder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { orderId: string },
  ) {
    if (!payload?.orderId) return;
    client.join(`order:${payload.orderId}`);
    this.logger.debug(
      `Socket ${client.id} subscribed to order:${payload.orderId}`,
    );
  }

  /**
   * Client unsubscribes from an order's updates.
   */
  @SubscribeMessage('unsubscribe_order')
  handleUnsubscribeOrder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { orderId: string },
  ) {
    if (!payload?.orderId) return;
    client.leave(`order:${payload.orderId}`);
  }

  // ─── Emit methods called from NotificationService / Consumer ─────────

  /**
   * Push a notification to a specific user (all their devices/tabs).
   */
  emitToUser(
    userId: string,
    event: string,
    data: Record<string, unknown>,
  ): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Push a real-time notification to a user, combining the event type
   * and the notification payload.
   */
  emitNotification(
    userId: string,
    notification: {
      id?: string;
      title: string;
      body: string;
      type: string;
      data?: Record<string, unknown>;
      timestamp?: string;
    },
  ): void {
    this.server.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
    });
  }

  /**
   * Emit order status change to all subscribers of an order room.
   */
  emitOrderStatusUpdate(
    orderId: string,
    data: {
      order_id: string;
      order_number?: string;
      status: string;
      previous_status?: string;
      estimated_delivery_at?: string;
      [key: string]: unknown;
    },
  ): void {
    this.server.to(`order:${orderId}`).emit('order_status_update', data);
  }

  /**
   * Emit delivery location update to all subscribers of an order room.
   */
  emitDeliveryLocationUpdate(
    orderId: string,
    data: {
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      eta_minutes?: number;
    },
  ): void {
    this.server.to(`order:${orderId}`).emit('delivery_location', data);
  }

  /**
   * Broadcast to all users with a specific role.
   */
  emitToRole(
    role: string,
    event: string,
    data: Record<string, unknown>,
  ): void {
    this.server.to(`role:${role}`).emit(event, data);
  }

  /**
   * Get count of currently connected users.
   */
  getConnectedUserCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if a specific user is connected.
   */
  isUserConnected(userId: string): boolean {
    const sockets = this.connectedUsers.get(userId);
    return !!sockets && sockets.size > 0;
  }
}
