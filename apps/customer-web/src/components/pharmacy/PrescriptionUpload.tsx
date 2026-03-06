import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

interface PrescriptionUploadProps {
  onUpload: (data: {
    image_url: string;
    image_hash: string;
    doctor_name?: string;
    doctor_license?: string;
    prescription_date?: string;
  }) => void;
  isLoading?: boolean;
}

export function PrescriptionUpload({ onUpload, isLoading }: PrescriptionUploadProps) {
  const { t } = useTranslation();
  const [imageUrl, setImageUrl] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorLicense, setDoctorLicense] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      // In production, this would upload to S3 and return a URL + hash
      setImageUrl(`/uploads/prescriptions/${Date.now()}_${file.name}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return;

    onUpload({
      image_url: imageUrl,
      image_hash: `sha256_${Date.now()}`, // Placeholder hash
      doctor_name: doctorName || undefined,
      doctor_license: doctorLicense || undefined,
      prescription_date: prescriptionDate || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {t('pharmacy.prescriptionImage', 'Prescription Image')} *
        </label>
        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-primary/50 transition-colors">
          {previewUrl ? (
            <div className="relative">
              <img src={previewUrl} alt="Prescription preview" className="mx-auto max-h-48 rounded-lg" />
              <button
                type="button"
                onClick={() => { setPreviewUrl(null); setImageUrl(''); }}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="cursor-pointer">
              <svg className="mx-auto h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('pharmacy.uploadPhoto', 'Take a photo or upload your prescription')}
              </p>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Doctor Info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {t('pharmacy.doctorName', "Doctor's Name")}
          </label>
          <input
            type="text"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder="Dr. Juan dela Cruz"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {t('pharmacy.doctorLicense', 'PRC License No.')}
          </label>
          <input
            type="text"
            value={doctorLicense}
            onChange={(e) => setDoctorLicense(e.target.value)}
            placeholder="PRC-0012345"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          {t('pharmacy.prescriptionDate', 'Prescription Date')}
        </label>
        <input
          type="date"
          value={prescriptionDate}
          onChange={(e) => setPrescriptionDate(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
      </div>

      <Button type="submit" disabled={!imageUrl || isLoading} className="w-full">
        {isLoading
          ? t('common.loading')
          : t('pharmacy.uploadPrescription', 'Upload Prescription')}
      </Button>
    </form>
  );
}
