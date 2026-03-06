import { useState } from 'react';
import { ReviewCard } from './ReviewCard';
import { ReviewStatsDisplay } from './ReviewStats';
import { ReviewForm } from './ReviewForm';
import { Button } from '@/components/ui/Button';
import { useReviews, useReviewStats } from '@/hooks/useReviews';
import { useAuthStore } from '@/stores/auth.store';

interface ReviewSectionProps {
  reviewableType: 'store' | 'product' | 'delivery_personnel';
  reviewableId: string;
}

export function ReviewSection({ reviewableType, reviewableId }: ReviewSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [filterRating, setFilterRating] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<'created_at' | 'rating' | 'helpful_count'>('created_at');

  const isAuthenticated = useAuthStore((s) => !!s.accessToken);

  const { data: stats, isLoading: statsLoading } = useReviewStats(reviewableType, reviewableId);

  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useReviews({
    reviewable_type: reviewableType,
    reviewable_id: reviewableId,
    rating: filterRating,
    sort_by: sortBy,
    limit: 10,
  });

  const reviews = reviewsData?.pages.flatMap((p) => p.data) || [];

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Reviews</h2>
        {isAuthenticated && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            Write a Review
          </Button>
        )}
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="mt-4 h-24 animate-pulse rounded-lg bg-muted" />
      ) : stats && stats.count > 0 ? (
        <div className="mt-4">
          <ReviewStatsDisplay
            stats={stats}
            onFilterRating={setFilterRating}
            activeRating={filterRating}
          />
        </div>
      ) : null}

      {/* Sort */}
      {reviews.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort by:</span>
          {(['created_at', 'helpful_count', 'rating'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                sortBy === opt
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {opt === 'created_at' ? 'Newest' : opt === 'helpful_count' ? 'Most Helpful' : 'Rating'}
            </button>
          ))}
          {filterRating && (
            <button
              onClick={() => setFilterRating(undefined)}
              className="ml-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/20"
            >
              Clear {filterRating}-star filter
            </button>
          )}
        </div>
      )}

      {/* Review list */}
      <div className="mt-4 space-y-5">
        {reviewsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          ))
        ) : reviews.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {filterRating
              ? `No ${filterRating}-star reviews yet.`
              : 'No reviews yet. Be the first to review!'}
          </p>
        ) : (
          reviews.map((review) => <ReviewCard key={review.id} review={review} />)
        )}
      </div>

      {/* Load more */}
      {hasNextPage && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading...' : 'Load More Reviews'}
          </Button>
        </div>
      )}

      {/* Review form modal */}
      {showForm && (
        <ReviewForm
          reviewableType={reviewableType}
          reviewableId={reviewableId}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
