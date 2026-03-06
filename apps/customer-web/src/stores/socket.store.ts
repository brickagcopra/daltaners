import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth.store';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  connect: () => void;
  disconnect: () => void;
  subscribeOrder: (orderId: string) => void;
  unsubscribeOrder: (orderId: string) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  isAuthenticated: false,

  connect: () => {
    const existing = get().socket;
    if (existing) return;

    const { user } = useAuthStore.getState();
    if (!user) return;

    const socket = io('/notifications', {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      set({ isConnected: true });
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        socket.emit('authenticate', { userId: currentUser.id, role: currentUser.role });
      }
    });

    socket.on('authenticated', () => {
      set({ isAuthenticated: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false, isAuthenticated: false });
    });

    socket.io.on('reconnect', () => {
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        socket.emit('authenticate', { userId: currentUser.id, role: currentUser.role });
      }
    });

    socket.connect();
    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      set({ socket: null, isConnected: false, isAuthenticated: false });
    }
  },

  subscribeOrder: (orderId: string) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('subscribe_order', { orderId });
    }
  },

  unsubscribeOrder: (orderId: string) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('unsubscribe_order', { orderId });
    }
  },
}));

// Auto-disconnect on logout
useAuthStore.subscribe((state) => {
  if (!state.isAuthenticated) {
    useSocketStore.getState().disconnect();
  }
});
