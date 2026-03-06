import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PrescriptionUpload } from '@/components/pharmacy/PrescriptionUpload';
import { PrescriptionList } from '@/components/pharmacy/PrescriptionList';
import { Button } from '@/components/ui/Button';
import { usePrescriptions, useUploadPrescription } from '@/hooks/usePrescriptions';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export function PharmacyPage() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'prescriptions'>('browse');

  // Fetch pharmacy stores
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ['pharmacy-stores'],
    queryFn: async () => {
      const { data } = await api.get('/stores?category=pharmacy');
      return data?.data || [];
    },
    staleTime: 60000,
  });

  const { data: prescriptions = [], isLoading: rxLoading } = usePrescriptions();
  const uploadMutation = useUploadPrescription();

  const handleUpload = (data: {
    image_url: string;
    image_hash: string;
    doctor_name?: string;
    doctor_license?: string;
    prescription_date?: string;
  }) => {
    uploadMutation.mutate(data, {
      onSuccess: () => setShowUpload(false),
    });
  };

  return (
    <div className="container-app py-6">
      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t('pharmacy.title', 'Pharmacy')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('pharmacy.subtitle', 'Order medicines and health products — OTC and prescription')}
        </p>
      </div>

      {/* Tab Switcher */}
      {isAuthenticated && (
        <div className="mb-6 flex border-b border-border">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'browse'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('pharmacy.browseTab', 'Browse Pharmacies')}
          </button>
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'prescriptions'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('pharmacy.prescriptionsTab', 'My Prescriptions')}
          </button>
        </div>
      )}

      {activeTab === 'browse' ? (
        <>
          {/* Prescription Upload CTA */}
          {isAuthenticated && (
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900">
                    {t('pharmacy.needRx', 'Need prescription medicine?')}
                  </h3>
                  <p className="mt-1 text-xs text-blue-700">
                    {t('pharmacy.rxDescription', 'Upload your prescription for pharmacist verification, then add Rx items to your cart.')}
                  </p>
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => setShowUpload(!showUpload)}
                  >
                    {showUpload
                      ? t('common.cancel')
                      : t('pharmacy.uploadPrescription', 'Upload Prescription')}
                  </Button>
                </div>
              </div>
              {showUpload && (
                <div className="mt-4 border-t border-blue-200 pt-4">
                  <PrescriptionUpload onUpload={handleUpload} isLoading={uploadMutation.isPending} />
                </div>
              )}
            </div>
          )}

          {/* Pharmacy Stores Grid */}
          {storesLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : stores.length === 0 ? (
            <div className="rounded-lg border border-border bg-white p-12 text-center">
              <p className="text-muted-foreground">
                {t('pharmacy.noPharmacies', 'No pharmacies available in your area')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((store: any) => (
                <Link
                  key={store.id}
                  to={`/stores/${store.slug}`}
                  className="group rounded-xl border border-border bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                      <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground line-clamp-1">{store.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{store.description}</p>
                    </div>
                  </div>
                  {store.metadata?.fda_license_number && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                      </svg>
                      {t('pharmacy.fdaLicensed', 'FDA Licensed')}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Prescriptions Tab */
        <PrescriptionList prescriptions={prescriptions as any[]} isLoading={rxLoading} />
      )}
    </div>
  );
}
