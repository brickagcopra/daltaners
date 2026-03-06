import { useState } from 'react';
import { StarRating } from './StarRating';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToggleHelpful } from '@/hooks/useReviews';
import type { Review } from '@/hooks/useReviews';

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const toggleHelpful = useToggleHelpful();

  const bodyText = review.body || '';
  const isLong = bodyText.length > 300;
  const displayText = isLong && !expanded ? bodyText.slice(0, 300) + '...' : bodyText;

  const timeAgo = formatTimeAgo(review.created_at);

  return (
    <div className="border-b border-border pb-5 last:border-b-0">
      {/* Header: avatar + name + rating + date */}
      <div className="flex items-start gap-3">
        <img
          src={review.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.user_id}`}
          alt={review.user_name}
          className="h-10 w-10 rounded-full bg-muted"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{review.user_name}</span>
            {review.is_verified_purchase && (
              <Badge variant="success" className="text-xs">Verified Purchase</Badge>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
        </div>
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="mt-2 text-sm font-semibold text-foreground">{review.title}</h4>
      )}

      {/* Body */}
      {bodyText && (
        <div className="mt-1">
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {displayText}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs font-medium text-primary hover:underline"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Images */}
      {review.images.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`Review photo ${idx + 1}`}
              className="h-20 w-20 rounded-lg object-cover flex-shrink-0 border border-border"
            />
          ))}
        </div>
      )}

      {/* Helpful button */}
      <div className="mt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleHelpful.mutate(review.id)}
          disabled={toggleHelpful.isPending}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
          </svg>
          Helpful ({review.helpful_count})
        </Button>
      </div>

      {/* Vendor response */}
      {review.vendor_response && (
        <div className="mt-3 ml-4 rounded-lg bg-muted/50 p-3 border-l-2 border-primary/30">
          <p className="text-xs font-semibold text-foreground">Store Response</p>
          <p className="mt-1 text-sm text-muted-foreground">{review.vendor_response}</p>
          {review.vendor_response_at && (
            <p className="mt-1 text-xs text-muted-foreground/70">
              {formatTimeAgo(review.vendor_response_at)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
