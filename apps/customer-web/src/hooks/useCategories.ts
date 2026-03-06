import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  sort_order: number;
  level: number;
  children: Category[];
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      const raw = data?.data ?? data ?? [];
      return Array.isArray(raw) ? raw as Category[] : [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — categories rarely change
  });
}
