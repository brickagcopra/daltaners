import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CityOption {
  name: string;
  lat: number;
  lng: number;
  label: string;
}

const CITIES: CityOption[] = [
  { name: 'Metro Manila', lat: 14.5547, lng: 121.0244, label: 'Metro Manila' },
  { name: 'Cebu', lat: 10.3157, lng: 123.8854, label: 'Cebu' },
  { name: 'Davao', lat: 7.0731, lng: 125.6128, label: 'Davao' },
];

interface CityState {
  selectedCity: string;
  cityLat: number;
  cityLng: number;
  cities: CityOption[];
  setCity: (cityName: string) => void;
  getCityCoords: () => { lat: number; lng: number };
}

export const useCityStore = create<CityState>()(
  persist(
    (set, get) => ({
      selectedCity: 'Metro Manila',
      cityLat: 14.5547,
      cityLng: 121.0244,
      cities: CITIES,
      setCity: (cityName: string) => {
        const city = CITIES.find((c) => c.name === cityName);
        if (city) {
          set({
            selectedCity: city.name,
            cityLat: city.lat,
            cityLng: city.lng,
          });
        }
      },
      getCityCoords: () => ({ lat: get().cityLat, lng: get().cityLng }),
    }),
    { name: 'daltaners-city' },
  ),
);
