import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data } = await api.get('/zones/cities');
      const cities = data.data || data || [];
      return Array.isArray(cities) ? cities as string[] : [];
    },
    staleTime: 5 * 60 * 1000, // cities rarely change
  });
}
