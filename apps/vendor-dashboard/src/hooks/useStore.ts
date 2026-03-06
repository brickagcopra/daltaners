import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiResponse } from '@/lib/api';

export interface OperatingHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  operatingHours: OperatingHours[];
  isActive: boolean;
  isOpen: boolean;
  averageRating: number;
  totalRatings: number;
  categories: string[];
  deliveryRadius: number;
  minimumOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'vendor_owner' | 'vendor_staff';
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface InviteStaffData {
  email: string;
  firstName: string;
  lastName: string;
  permissions: string[];
}

export interface UpdateStoreData {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  operatingHours?: OperatingHours[];
  deliveryRadius?: number;
  minimumOrder?: number;
  isActive?: boolean;
  logo_url?: string | null;
  banner_url?: string | null;
}

export function useMyStore() {
  return useQuery({
    queryKey: ['my-store'],
    queryFn: async () => {
      // Uses the vendor controller's GET /vendors/stores/me endpoint
      const { data } = await api.get<ApiResponse<Store>>('/stores/me');
      return data.data;
    },
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      storeId,
      updateData,
    }: {
      storeId: string;
      updateData: UpdateStoreData | FormData;
    }) => {
      const isFormData = updateData instanceof FormData;
      const { data } = await api.patch<ApiResponse<Store>>(
        `/stores/${storeId}`,
        updateData,
        isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-store'] });
    },
  });
}

export function useStoreStaff(storeId: string | null) {
  return useQuery({
    queryKey: ['store-staff', storeId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<StaffMember[]>>(
        `/stores/${storeId}/staff`,
      );
      return data.data;
    },
    enabled: !!storeId,
  });
}

export function useInviteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      storeId,
      staffData,
    }: {
      storeId: string;
      staffData: InviteStaffData;
    }) => {
      const { data } = await api.post<ApiResponse<StaffMember>>(
        `/stores/${storeId}/staff/invite`,
        staffData,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-staff'] });
    },
  });
}

export function useRemoveStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      storeId,
      staffId,
    }: {
      storeId: string;
      staffId: string;
    }) => {
      await api.delete(`/stores/${storeId}/staff/${staffId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-staff'] });
    },
  });
}

export function useUpdateStaffPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      storeId,
      staffId,
      permissions,
    }: {
      storeId: string;
      staffId: string;
      permissions: string[];
    }) => {
      const { data } = await api.patch<ApiResponse<StaffMember>>(
        `/stores/${storeId}/staff/${staffId}/permissions`,
        { permissions },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-staff'] });
    },
  });
}

export function useDashboardStats(storeId: string | null) {
  return useQuery({
    queryKey: ['dashboard-stats', storeId],
    queryFn: async () => {
      const { data } = await api.get<
        ApiResponse<{
          todayOrders: number;
          todayRevenue: number;
          pendingOrders: number;
          lowStockItems: number;
          todayOrdersTrend: number;
          todayRevenueTrend: number;
          pendingOrdersTrend: number;
          lowStockItemsTrend: number;
          revenueChart: Array<{ date: string; revenue: number }>;
          recentOrders: Array<{
            id: string;
            orderNumber: string;
            customerName: string;
            total: number;
            status: string;
            createdAt: string;
          }>;
        }>
      >(`/stores/${storeId}/dashboard`);
      return data.data;
    },
    enabled: !!storeId,
    refetchInterval: 60000,
  });
}
