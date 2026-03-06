const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending Review' },
  verified: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Verified' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Expired' },
};

interface PrescriptionStatusBadgeProps {
  status: string;
}

export function PrescriptionStatusBadge({ status }: PrescriptionStatusBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}
