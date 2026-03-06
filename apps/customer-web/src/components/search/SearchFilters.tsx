import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import type { SearchAggregations, BucketAgg } from '@/hooks/useSearch';

interface SearchFiltersProps {
  sortBy: string;
  sortOrder: string;
  onSortChange: (sortBy: string, sortOrder: string) => void;
  minPrice?: number;
  maxPrice?: number;
  onPriceChange: (min?: number, max?: number) => void;
  selectedBrand?: string;
  onBrandChange: (brand?: string) => void;
  selectedDietaryTags?: string[];
  onDietaryTagsChange: (tags: string[]) => void;
  aggregations?: SearchAggregations;
  className?: string;
}

const SORT_OPTIONS = [
  { value: '_score', order: 'desc', label: 'Relevance' },
  { value: 'total_sold', order: 'desc', label: 'Most Popular' },
  { value: 'created_at', order: 'desc', label: 'Newest' },
  { value: 'base_price', order: 'asc', label: 'Price: Low to High' },
  { value: 'base_price', order: 'desc', label: 'Price: High to Low' },
  { value: 'rating_average', order: 'desc', label: 'Top Rated' },
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
  sortOrder,
  onSortChange,
  minPrice,
  maxPrice,
  onPriceChange,
  selectedBrand,
  onBrandChange,
  selectedDietaryTags = [],
  onDietaryTagsChange,
  aggregations,
  className,
}: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activePriceIndex = PRICE_RANGES.findIndex(
    (r) => r.min === minPrice && r.max === maxPrice,
  );

  const activeSortKey = `${sortBy}|${sortOrder}`;

  const brands: BucketAgg[] = aggregations?.brands?.buckets ?? [];
  const dietaryTags: BucketAgg[] = aggregations?.dietary_tags?.buckets ?? [];

  const activeFilterCount =
    (selectedBrand ? 1 : 0) +
    selectedDietaryTags.length +
    (minPrice !== undefined || maxPrice !== undefined ? 1 : 0);

  const handleToggleDietaryTag = (tag: string) => {
    if (selectedDietaryTags.includes(tag)) {
      onDietaryTagsChange(selectedDietaryTags.filter((t) => t !== tag));
    } else {
      onDietaryTagsChange([...selectedDietaryTags, tag]);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Sort + Filter Toggle Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {SORT_OPTIONS.map((opt) => {
            const key = `${opt.value}|${opt.order}`;
            return (
              <button
                key={key}
                onClick={() => onSortChange(opt.value, opt.order)}
                className={cn(
                  'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  activeSortKey === key
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative flex-shrink-0"
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
          {activeFilterCount > 0 && (
            <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="rounded-lg border border-border bg-white p-4 space-y-5">
          {/* Price Range */}
          <div>
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

          {/* Brands (from aggregations) */}
          {brands.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-foreground">Brand</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onBrandChange(undefined)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    !selectedBrand
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground',
                  )}
                >
                  All Brands
                </button>
                {brands
                  .filter((b) => b.key !== 'Unknown')
                  .map((brand) => (
                    <button
                      key={brand.key}
                      onClick={() => onBrandChange(brand.key)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                        selectedBrand === brand.key
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground',
                      )}
                    >
                      {brand.key}
                      <span className="ml-1 opacity-60">({brand.doc_count})</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Dietary Tags (from aggregations) */}
          {dietaryTags.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-foreground">Dietary</h4>
              <div className="flex flex-wrap gap-2">
                {dietaryTags.map((tag) => (
                  <button
                    key={tag.key}
                    onClick={() => handleToggleDietaryTag(tag.key)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                      selectedDietaryTags.includes(tag.key)
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground',
                    )}
                  >
                    {tag.key}
                    <span className="ml-1 opacity-60">({tag.doc_count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
