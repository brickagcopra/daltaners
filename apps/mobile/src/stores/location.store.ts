import { create } from 'zustand';
import * as Location from 'expo-location';
import type { Address, GeoCoordinates } from '../types';

interface LocationState {
  currentLocation: GeoCoordinates | null;
  selectedAddress: Address | null;
  addresses: Address[];
  locationPermission: 'undetermined' | 'granted' | 'denied';
  isLocating: boolean;

  // Actions
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<GeoCoordinates | null>;
  setSelectedAddress: (address: Address) => void;
  setAddresses: (addresses: Address[]) => void;
  startWatching: (callback: (coords: GeoCoordinates) => void) => Promise<Location.LocationSubscription | null>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  currentLocation: null,
  selectedAddress: null,
  addresses: [],
  locationPermission: 'undetermined',
  isLocating: false,

  requestPermission: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
    set({ locationPermission: granted ? 'granted' : 'denied' });
    return granted;
  },

  getCurrentLocation: async () => {
    const state = get();
    if (state.locationPermission !== 'granted') {
      const granted = await state.requestPermission();
      if (!granted) return null;
    }

    set({ isLocating: true });
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: GeoCoordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      set({ currentLocation: coords, isLocating: false });
      return coords;
    } catch {
      set({ isLocating: false });
      return null;
    }
  },

  setSelectedAddress: (address) => set({ selectedAddress: address }),

  setAddresses: (addresses) => {
    set({ addresses });
    // Auto-select default address if none selected
    if (!get().selectedAddress) {
      const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0];
      if (defaultAddr) set({ selectedAddress: defaultAddr });
    }
  },

  startWatching: async (callback) => {
    const state = get();
    if (state.locationPermission !== 'granted') {
      const granted = await state.requestPermission();
      if (!granted) return null;
    }

    return Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        const coords: GeoCoordinates = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        set({ currentLocation: coords });
        callback(coords);
      },
    );
  },
}));
