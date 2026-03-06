import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '@/stores/socket.store';
import type { OrderStatus } from './useOrders';

interface RiderLocation {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  eta_minutes?: number;
}

const TRACKING_STATUSES: OrderStatus[] = ['picked_up', 'on_the_way', 'in_transit'];

export function useOrderTracking(orderId: string | undefined, currentStatus: OrderStatus | undefined) {
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const socket = useSocketStore((state) => state.socket);
  const subscribeOrder = useSocketStore((state) => state.subscribeOrder);
  const unsubscribeOrder = useSocketStore((state) => state.unsubscribeOrder);
  const isConnected = useSocketStore((state) => state.isConnected);

  const isTrackingActive = !!(
    orderId &&
    currentStatus &&
    TRACKING_STATUSES.includes(currentStatus) &&
    isConnected
  );

  const handleDeliveryLocation = useCallback((data: RiderLocation) => {
    setRiderLocation(data);
  }, []);

  const handleOrderStatusUpdate = useCallback(
    (data: { order_id: string; status: string }) => {
      if (orderId && data.order_id === orderId) {
        setLastStatusUpdate(data.status);
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      }
    },
    [orderId, queryClient],
  );

  useEffect(() => {
    if (!orderId || !currentStatus || !TRACKING_STATUSES.includes(currentStatus) || !socket || !isConnected) {
      return;
    }

    subscribeOrder(orderId);
    socket.on('delivery_location', handleDeliveryLocation);
    socket.on('order_status_update', handleOrderStatusUpdate);

    return () => {
      socket.off('delivery_location', handleDeliveryLocation);
      socket.off('order_status_update', handleOrderStatusUpdate);
      unsubscribeOrder(orderId);
    };
  }, [orderId, currentStatus, socket, isConnected, subscribeOrder, unsubscribeOrder, handleDeliveryLocation, handleOrderStatusUpdate]);

  return { riderLocation, isTrackingActive, lastStatusUpdate };
}

export type { RiderLocation };
