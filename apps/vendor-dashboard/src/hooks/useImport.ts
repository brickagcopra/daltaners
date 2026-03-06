import { useMutation } from '@tanstack/react-query';
import { api, ApiResponse } from '@/lib/api';

export interface CsvRowError {
  row: number;
  field: string;
  message: string;
}

export interface CsvImportResult {
  total_rows: number;
  successful: number;
  failed: number;
  errors: CsvRowError[];
}

export function useImportProducts() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post<ApiResponse<CsvImportResult>>(
        '/catalog/products/import',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
        },
      );
      return data.data;
    },
  });
}

export function useDownloadTemplate() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/catalog/products/import/template', {
        responseType: 'blob',
      });

      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'product-import-template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}
