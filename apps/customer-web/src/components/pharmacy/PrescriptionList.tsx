import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PrescriptionStatusBadge } from './PrescriptionStatusBadge';

interface Prescription {
  id: string;
  image_url: string;
  status: string;
  doctor_name: string | null;
  doctor_license: string | null;
  prescription_date: string | null;
  created_at: string;
}

interface PrescriptionListProps {
  prescriptions: Prescription[];
  isLoading?: boolean;
}

export function PrescriptionList({ prescriptions, isLoading }: PrescriptionListProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg border border-border bg-white p-4">
            <div className="flex gap-3">
              <div className="h-16 w-16 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-3 w-32 rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!prescriptions.length) {
    return (
      <div className="rounded-lg border border-border bg-white p-8 text-center">
        <svg className="mx-auto h-10 w-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="mt-3 text-sm text-muted-foreground">
          {t('pharmacy.noPrescriptions', 'No prescriptions uploaded yet')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {prescriptions.map((rx) => (
        <Link
          key={rx.id}
          to={`/prescriptions/${rx.id}`}
          className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 transition-colors hover:bg-muted/50"
        >
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
            <img
              src={rx.image_url}
              alt="Prescription"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '';
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <PrescriptionStatusBadge status={rx.status} />
            </div>
            {rx.doctor_name && (
              <p className="mt-1 text-sm text-foreground">{rx.doctor_name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(rx.created_at).toLocaleDateString()}
            </p>
          </div>
          <svg className="h-4 w-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
