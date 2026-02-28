import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';

interface SearchFiltersProps {
  sortBy: string;
  onSortChange: (sort: string) => void;
  minPrice?: number;
  maxPrice?: number;
  onPriceChange: (min?: number, max?: number) => void;
  className?: string;
}

const SORT_OPTIONS = [
  { value: '', label: 'Relevance' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const PRICE_RANGES = [
  { label: 'All Prices', min: undefined, max: undefined },
  { label: 'Under PHP 100', min: undefined, max: 100 },
  { label: 'PHP 100 - 500', min: 100, max: 500 },
  { label: 'PHP 500 - 1,000', min: 500, max: 1000 },
  { label: 'Over PHP 1,000', min: 1000, max: undefined },
];

export function SearchFilters({
  sortBy,
  onSortChange,
  minPrice,
  maxPrice,
  onPriceChange,
  className,
}: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activePriceIndex = PRICE_RANGES.findIndex(
    (r) => r.min === minPrice && r.max === maxPrice,
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Sort + Filter Toggle Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              className={cn(
                'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                sortBy === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-shrink-0"
        >
          <svg
            className="mr-1.5 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
            />
          </svg>
          Filters
        </Button>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="rounded-lg border border-border bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold text-foreground">Price Range</h4>
          <div className="flex flex-wrap gap-2">
            {PRICE_RANGES.map((range, idx) => (
              <button
                key={range.label}
                onClick={() => onPriceChange(range.min, range.max)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  activePriceIndex === idx
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground',
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
