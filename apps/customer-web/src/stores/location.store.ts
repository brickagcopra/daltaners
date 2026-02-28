import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  is_default: boolean;
}

interface LocationState {
  currentLocation: Location | null;
  selectedAddress: SavedAddress | null;
  savedAddresses: SavedAddress[];
  setLocation: (location: Location) => void;
  setSelectedAddress: (address: SavedAddress | null) => void;
  setSavedAddresses: (addresses: SavedAddress[]) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      currentLocation: null,
      selectedAddress: null,
      savedAddresses: [],
      setLocation: (location) => set({ currentLocation: location }),
      setSelectedAddress: (address) => set({ selectedAddress: address }),
      setSavedAddresses: (addresses) => set({ savedAddresses: addresses }),
      clearLocation: () => set({ currentLocation: null, selectedAddress: null }),
    }),
    { name: 'daltaners-location' },
  ),
);
