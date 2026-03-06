import { StarRating } from './StarRating';
import type { ReviewStats as ReviewStatsType } from '@/hooks/useReviews';

interface ReviewStatsProps {
  stats: ReviewStatsType;
  onFilterRating?: (rating: number | undefined) => void;
  activeRating?: number;
}

export function ReviewStatsDisplay({ stats, onFilterRating, activeRating }: ReviewStatsProps) {
  const maxCount = Math.max(...Object.values(stats.distribution), 1);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
      {/* Average */}
      <div className="flex flex-col items-center">
        <span className="text-4xl font-bold text-foreground">{stats.average.toFixed(1)}</span>
        <StarRating rating={stats.average} size="md" />
        <span className="mt-1 text-sm text-muted-foreground">{stats.count} reviews</span>
      </div>

      {/* Distribution bars */}
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = stats.distribution[star] || 0;
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const isActive = activeRating === star;

          return (
            <button
              key={star}
              type="button"
              onClick={() => onFilterRating?.(isActive ? undefined : star)}
              className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-sm transition-colors ${
                isActive ? 'bg-amber-50' : 'hover:bg-muted/50'
              }`}
            >
              <span className="w-3 text-right text-muted-foreground">{star}</span>
              <svg className="h-3.5 w-3.5 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <div className="flex-1 overflow-hidden rounded-full bg-gray-200 h-2">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-right text-xs text-muted-foreground">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
