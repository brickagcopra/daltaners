import { io, Socket } from 'socket.io-client';
import { getTokens } from './auth';

const NOTIFICATION_URL = __DEV__
  ? 'http://10.0.2.2:3010'
  : 'https://api.daltaners.ph';

const DELIVERY_URL = __DEV__
  ? 'http://10.0.2.2:3007'
  : 'https://api.daltaners.ph';

const CHAT_URL = __DEV__
  ? 'http://10.0.2.2:3013'
  : 'https://api.daltaners.ph';

let notificationSocket: Socket | null = null;
let deliverySocket: Socket | null = null;
let chatSocket: Socket | null = null;

async function createSocket(url: string, namespace: string): Promise<Socket> {
  const tokens = await getTokens();
  const socket = io(`${url}${namespace}`, {
    auth: { token: tokens?.access_token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
  });

  socket.on('connect_error', (err) => {
    console.warn(`[Socket ${namespace}] Connection error:`, err.message);
  });

  return socket;
}

// Notification socket (for all app types)
export async function connectNotifications(): Promise<Socket> {
  if (notificationSocket?.connected) return notificationSocket;
  notificationSocket = await createSocket(NOTIFICATION_URL, '/notifications');

  notificationSocket.on('connect', () => {
    const tokens = getTokens();
    tokens.then((t) => {
      if (t) notificationSocket?.emit('authenticate', { token: t.access_token });
    });
  });

  return notificationSocket;
}

// Delivery tracking socket (for customer tracking + delivery personnel)
export async function connectDeliveryTracking(): Promise<Socket> {
  if (deliverySocket?.connected) return deliverySocket;
  deliverySocket = await createSocket(DELIVERY_URL, '/tracking');
  return deliverySocket;
}

// Chat socket
export async function connectChat(): Promise<Socket> {
  if (chatSocket?.connected) return chatSocket;
  chatSocket = await createSocket(CHAT_URL, '/chat');

  chatSocket.on('connect', () => {
    const tokens = getTokens();
    tokens.then((t) => {
      if (t) chatSocket?.emit('authenticate', { token: t.access_token });
    });
  });

  return chatSocket;
}

// Subscribe to order tracking updates
export function subscribeToOrder(orderId: string): void {
  notificationSocket?.emit('subscribe_order', { order_id: orderId });
  deliverySocket?.emit('subscribe_delivery', { order_id: orderId });
}

export function unsubscribeFromOrder(orderId: string): void {
  notificationSocket?.emit('unsubscribe_order', { order_id: orderId });
  deliverySocket?.emit('unsubscribe_delivery', { order_id: orderId });
}

// Delivery personnel: send GPS location
export function sendLocation(latitude: number, longitude: number, heading?: number, speed?: number): void {
  deliverySocket?.emit('location_update', {
    latitude,
    longitude,
    heading,
    speed,
    timestamp: new Date().toISOString(),
  });
}

export function disconnectAll(): void {
  notificationSocket?.disconnect();
  deliverySocket?.disconnect();
  chatSocket?.disconnect();
  notificationSocket = null;
  deliverySocket = null;
  chatSocket = null;
}

export { notificationSocket, deliverySocket, chatSocket };
