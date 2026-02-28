import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';

interface QuantitySelectorProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function QuantitySelector({
  quantity,
  onIncrease,
  onDecrease,
  min = 0,
  max = 99,
  size = 'md',
  className,
}: QuantitySelectorProps) {
  const isSmall = size === 'sm';

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-border',
        className,
      )}
    >
      <Button
        variant="ghost"
        size={isSmall ? 'icon-sm' : 'icon'}
        onClick={onDecrease}
        disabled={quantity <= min}
        className="rounded-r-none border-r border-border"
        aria-label="Decrease quantity"
      >
        <svg
          className={cn('text-foreground', isSmall ? 'h-3 w-3' : 'h-4 w-4')}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
        </svg>
      </Button>
      <span
        className={cn(
          'flex items-center justify-center font-medium text-foreground select-none',
          isSmall ? 'w-8 text-xs' : 'w-10 text-sm',
        )}
      >
        {quantity}
      </span>
      <Button
        variant="ghost"
        size={isSmall ? 'icon-sm' : 'icon'}
        onClick={onIncrease}
        disabled={quantity >= max}
        className="rounded-l-none border-l border-border"
        aria-label="Increase quantity"
      >
        <svg
          className={cn('text-foreground', isSmall ? 'h-3 w-3' : 'h-4 w-4')}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </Button>
    </div>
  );
}
