import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-medium',
  {
    variants: {
      variant: {
        default: 'bg-gray-700 text-gray-300',
        primary: 'bg-primary-500/20 text-primary-400',
        success: 'bg-emerald-500/20 text-emerald-400',
        warning: 'bg-amber-500/20 text-amber-400',
        danger: 'bg-red-500/20 text-red-400',
        info: 'bg-blue-500/20 text-blue-400',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ children, variant, size, className, dot }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const statusMap: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'primary'; label: string }> = {
  // Terminal status
  active: { variant: 'success', label: 'Active' },
  inactive: { variant: 'default', label: 'Inactive' },
  maintenance: { variant: 'warning', label: 'Maintenance' },
  // Shift status
  open: { variant: 'success', label: 'Open' },
  closed: { variant: 'default', label: 'Closed' },
  suspended: { variant: 'warning', label: 'Suspended' },
  // Transaction status
  completed: { variant: 'success', label: 'Completed' },
  voided: { variant: 'danger', label: 'Voided' },
  pending: { variant: 'warning', label: 'Pending' },
  // Transaction type
  sale: { variant: 'primary', label: 'Sale' },
  refund: { variant: 'danger', label: 'Refund' },
  exchange: { variant: 'info', label: 'Exchange' },
  // Payment method
  cash: { variant: 'success', label: 'Cash' },
  card: { variant: 'info', label: 'Card' },
  gcash: { variant: 'info', label: 'GCash' },
  maya: { variant: 'info', label: 'Maya' },
  wallet: { variant: 'primary', label: 'Wallet' },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = statusMap[status] || { variant: 'default' as const, label: status };
  return (
    <Badge variant={config.variant} className={className} dot>
      {config.label}
    </Badge>
  );
}
