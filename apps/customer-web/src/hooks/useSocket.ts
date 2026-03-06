import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useSocketStore } from '@/stores/socket.store';

export function useSocket() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const connect = useSocketStore((state) => state.connect);
  const disconnect = useSocketStore((state) => state.disconnect);
  const isConnected = useSocketStore((state) => state.isConnected);
  const isSocketAuthenticated = useSocketStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
  }, [isAuthenticated, connect, disconnect]);

  return { isConnected, isAuthenticated: isSocketAuthenticated };
}
