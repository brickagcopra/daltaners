import { useState } from 'react';
import { StarRating } from './StarRating';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateReview } from '@/hooks/useReviews';

interface ReviewFormProps {
  reviewableType: 'store' | 'product' | 'delivery_personnel';
  reviewableId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReviewForm({ reviewableType, reviewableId, onClose, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const createReview = useCreateReview();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    createReview.mutate(
      {
        reviewable_type: reviewableType,
        reviewable_id: reviewableId,
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Write a Review</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Rating */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Your Rating <span className="text-destructive">*</span>
            </label>
            <StarRating rating={rating} size="lg" interactive onChange={setRating} />
            {rating === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Tap a star to rate</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label htmlFor="review-title" className="mb-1.5 block text-sm font-medium text-foreground">
              Title (optional)
            </label>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              maxLength={255}
            />
          </div>

          {/* Body */}
          <div>
            <label htmlFor="review-body" className="mb-1.5 block text-sm font-medium text-foreground">
              Review (optional)
            </label>
            <textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell others about your experience..."
              maxLength={5000}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">{body.length}/5000</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={rating === 0 || createReview.isPending}>
              {createReview.isPending ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>

          {createReview.isError && (
            <p className="text-sm text-destructive text-center">
              Failed to submit review. Please try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
