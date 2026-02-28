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
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/delivery' })
export class DeliveryGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DeliveryGateway.name);

  afterInit(_server: Server) {
    this.logger.log('Delivery WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_order')
  handleJoinOrder(
    @MessageBody() data: { order_id: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`order:${data.order_id}`);
    this.logger.log(`Client ${client.id} joined order room: ${data.order_id}`);
    return { event: 'joined', data: { order_id: data.order_id } };
  }

  @SubscribeMessage('leave_order')
  handleLeaveOrder(
    @MessageBody() data: { order_id: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`order:${data.order_id}`);
    this.logger.log(`Client ${client.id} left order room: ${data.order_id}`);
    return { event: 'left', data: { order_id: data.order_id } };
  }

  @SubscribeMessage('join_rider')
  handleJoinRider(
    @MessageBody() data: { rider_id: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`rider:${data.rider_id}`);
    this.logger.log(`Client ${client.id} joined rider room: ${data.rider_id}`);
    return { event: 'joined_rider', data: { rider_id: data.rider_id } };
  }

  broadcastLocationUpdate(
    orderId: string,
    location: { lat: number; lng: number; heading?: number },
  ) {
    this.server.to(`order:${orderId}`).emit('location_update', {
      order_id: orderId,
      ...location,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastStatusUpdate(orderId: string, status: string) {
    this.server.to(`order:${orderId}`).emit('status_update', {
      order_id: orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  notifyRider(riderId: string, event: string, data: Record<string, unknown>) {
    this.server.to(`rider:${riderId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}
