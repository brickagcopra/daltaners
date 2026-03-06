import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiResponse } from '@/lib/api';

export interface ProductVariant {
  id?: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  weight: number | null;
  weightUnit: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  subcategory: string | null;
  images: string[];
  price: number;
  compareAtPrice: number | null;
  variants: ProductVariant[];
  isActive: boolean;
  stock: number;
  sku: string;
  barcode: string | null;
  weight: number | null;
  weightUnit: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  barcode?: string;
  stock: number;
  weight?: number;
  weightUnit?: string;
  tags?: string[];
  isActive: boolean;
  images?: File[];
  variants?: ProductVariant[];
}

interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
}

export function useStoreProducts(storeId: string | null, filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ['store-products', storeId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.category) params.set('category', filters.category);
      if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));

      const { data } = await api.get<ApiResponse<Product[]>>(
        `/catalog/stores/${storeId}/products?${params.toString()}`,
      );
      return data;
    },
    enabled: !!storeId,
  });
}

export function useProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Product>>(`/catalog/products/${productId}`);
      return data.data;
    },
    enabled: !!productId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storeId, formData }: { storeId: string; formData: FormData }) => {
      const { data } = await api.post<ApiResponse<Product>>(
        `/catalog/stores/${storeId}/products`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, formData }: { productId: string; formData: FormData }) => {
      const { data } = await api.patch<ApiResponse<Product>>(
        `/catalog/products/${productId}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/catalog/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
    },
  });
}
