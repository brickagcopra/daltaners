import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Prescription {
  id: string;
  customer_id: string;
  image_url: string;
  image_hash: string;
  status: string;
  verified_by: string | null;
  verification_notes: string | null;
  doctor_name: string | null;
  doctor_license: string | null;
  prescription_date: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CreatePrescriptionData {
  image_url: string;
  image_hash: string;
  doctor_name?: string;
  doctor_license?: string;
  prescription_date?: string;
  expires_at?: string;
}

export function usePrescriptions(status?: string) {
  return useQuery({
    queryKey: ['prescriptions', status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const { data } = await api.get(`/prescriptions?${params.toString()}`);
      return (data?.data || []) as Prescription[];
    },
    staleTime: 30000,
  });
}

export function usePrescription(id: string) {
  return useQuery({
    queryKey: ['prescription', id],
    queryFn: async () => {
      const { data } = await api.get(`/prescriptions/${id}`);
      return data?.data as Prescription;
    },
    enabled: !!id,
  });
}

export function useUploadPrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreatePrescriptionData) => {
      const { data } = await api.post('/prescriptions', dto);
      return data?.data as Prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });
}
