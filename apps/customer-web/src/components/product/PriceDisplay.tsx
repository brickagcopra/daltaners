import { cn } from '@/components/ui/cn';

interface PriceDisplayProps {
  price: number;
  salePrice?: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function formatPHP(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function PriceDisplay({ price, salePrice, size = 'sm', className }: PriceDisplayProps) {
  const hasSale = salePrice !== null && salePrice !== undefined && salePrice < price;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  return (
    <div className={cn('flex items-baseline gap-1.5', className)}>
      {hasSale ? (
        <>
          <span className={cn('font-bold text-destructive', sizeClasses[size])}>
            {formatPHP(salePrice)}
          </span>
          <span
            className={cn(
              'text-muted-foreground line-through',
              size === 'lg' ? 'text-sm' : 'text-xs',
            )}
          >
            {formatPHP(price)}
          </span>
        </>
      ) : (
        <span className={cn('font-bold text-foreground', sizeClasses[size])}>
          {formatPHP(price)}
        </span>
      )}
    </div>
  );
}

export { formatPHP };
