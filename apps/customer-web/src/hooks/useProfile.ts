import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
}

interface Address {
  id: string;
  label: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  province: string;
  postal_code: string;
  lat: number;
  lng: number;
  is_default: boolean;
  contact_name: string;
  contact_phone: string;
  instructions: string | null;
}

interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

interface CreateAddressPayload {
  label: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  province: string;
  postal_code: string;
  lat: number;
  lng: number;
  is_default?: boolean;
  contact_name: string;
  contact_phone: string;
  instructions?: string;
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Profile }>('/users/me');
      return data.data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const { data } = await api.patch<{ success: boolean; data: Profile }>('/users/me', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useAddresses() {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Address[] }>('/users/me/addresses');
      return data.data;
    },
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAddressPayload) => {
      const { data } = await api.post<{ success: boolean; data: Address }>(
        '/users/me/addresses',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/me/addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

export type { Profile, Address, UpdateProfilePayload, CreateAddressPayload };
