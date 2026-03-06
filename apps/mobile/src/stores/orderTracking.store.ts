import { create } from 'zustand';
import { connectDeliveryTracking, subscribeToOrder, unsubscribeFromOrder } from '../services/socket';
import type { GeoCoordinates, OrderStatus } from '../types';

interface TrackingData {
  orderId: string;
  status: OrderStatus;
  riderLocation: GeoCoordinates | null;
  riderName?: string;
  riderPhone?: string;
  vehicleType?: string;
  eta?: number; // minutes
  isLive: boolean;
}

interface OrderTrackingState {
  activeTracking: Map<string, TrackingData>;

  // Actions
  startTracking: (orderId: string) => Promise<void>;
  stopTracking: (orderId: string) => void;
  updateRiderLocation: (orderId: string, coords: GeoCoordinates) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateEta: (orderId: string, eta: number) => void;
  getTracking: (orderId: string) => TrackingData | undefined;
  isTracking: (orderId: string) => boolean;
}

export const useOrderTrackingStore = create<OrderTrackingState>((set, get) => ({
  activeTracking: new Map(),

  startTracking: async (orderId) => {
    if (get().activeTracking.has(orderId)) return;

    const socket = await connectDeliveryTracking();

    // Set initial tracking data
    const tracking: TrackingData = {
      orderId,
      status: 'in_transit',
      riderLocation: null,
      isLive: true,
    };

    set((state) => {
      const updated = new Map(state.activeTracking);
      updated.set(orderId, tracking);
      return { activeTracking: updated };
    });

    subscribeToOrder(orderId);

    // Listen for location updates
    socket.on(`delivery_location:${orderId}`, (data: { latitude: number; longitude: number; eta?: number }) => {
      get().updateRiderLocation(orderId, { latitude: data.latitude, longitude: data.longitude });
      if (data.eta) get().updateEta(orderId, data.eta);
    });

    // Listen for status updates
    socket.on(`order_status:${orderId}`, (data: { status: OrderStatus }) => {
      get().updateOrderStatus(orderId, data.status);
      if (data.status === 'delivered' || data.status === 'cancelled') {
        get().stopTracking(orderId);
      }
    });
  },

  stopTracking: (orderId) => {
    unsubscribeFromOrder(orderId);
    set((state) => {
      const updated = new Map(state.activeTracking);
      updated.delete(orderId);
      return { activeTracking: updated };
    });
  },

  updateRiderLocation: (orderId, coords) => {
    set((state) => {
      const tracking = state.activeTracking.get(orderId);
      if (!tracking) return state;
      const updated = new Map(state.activeTracking);
      updated.set(orderId, { ...tracking, riderLocation: coords });
      return { activeTracking: updated };
    });
  },

  updateOrderStatus: (orderId, status) => {
    set((state) => {
      const tracking = state.activeTracking.get(orderId);
      if (!tracking) return state;
      const updated = new Map(state.activeTracking);
      updated.set(orderId, { ...tracking, status });
      return { activeTracking: updated };
    });
  },

  updateEta: (orderId, eta) => {
    set((state) => {
      const tracking = state.activeTracking.get(orderId);
      if (!tracking) return state;
      const updated = new Map(state.activeTracking);
      updated.set(orderId, { ...tracking, eta });
      return { activeTracking: updated };
    });
  },

  getTracking: (orderId) => get().activeTracking.get(orderId),
  isTracking: (orderId) => get().activeTracking.has(orderId),
}));
