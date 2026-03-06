import { useState } from 'react';
import { useVendorReviews, useRespondToReview } from '@/hooks/useReviews';
import type { Review } from '@/hooks/useReviews';

export function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [respondingReview, setRespondingReview] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState('');

  const { data, isLoading } = useVendorReviews({ page, limit: 20 });
  const respondMutation = useRespondToReview();

  const reviews = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta;

  const handleRespond = () => {
    if (!respondingReview || !responseText.trim()) return;
    respondMutation.mutate(
      { reviewId: respondingReview.id, response: responseText.trim() },
      {
        onSuccess: () => {
          setRespondingReview(null);
          setResponseText('');
        },
      },
    );
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case 'store': return 'Store';
      case 'product': return 'Product';
      case 'delivery_personnel': return 'Delivery';
      default: return type;
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500">
            Manage reviews for your store and products
            {meta ? ` (${meta.total} total)` : ''}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Review</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Response</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                    No reviews yet. Reviews will appear here as customers rate your store and products.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={review.user_avatar}
                          alt=""
                          className="h-8 w-8 rounded-full bg-gray-100"
                        />
                        <span className="text-sm font-medium text-gray-900">{review.user_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        review.reviewable_type === 'store'
                          ? 'bg-blue-50 text-blue-700'
                          : review.reviewable_type === 'product'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-green-50 text-green-700'
                      }`}>
                        {typeLabel(review.reviewable_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg
                            key={i}
                            className={`h-4 w-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div>
                        {review.title && (
                          <p className="text-sm font-medium text-gray-900 truncate">{review.title}</p>
                        )}
                        {review.body && (
                          <p className="text-sm text-gray-500 truncate">{review.body}</p>
                        )}
                        {review.is_verified_purchase && (
                          <span className="text-xs text-green-600">Verified Purchase</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(review.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      {review.vendor_response ? (
                        <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Responded
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setRespondingReview(review);
                          setResponseText(review.vendor_response || '');
                        }}
                        className="text-sm font-medium text-orange-600 hover:text-orange-700"
                      >
                        {review.vendor_response ? 'Edit' : 'Respond'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
            <p className="text-sm text-gray-500">
              Page {meta.page} of {meta.totalPages} ({meta.total} reviews)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= meta.totalPages}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Respond Modal */}
      {respondingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {respondingReview.vendor_response ? 'Edit Response' : 'Respond to Review'}
              </h3>
              <button
                onClick={() => setRespondingReview(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Review preview */}
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <img src={respondingReview.user_avatar} alt="" className="h-8 w-8 rounded-full" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{respondingReview.user_name}</p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        className={`h-3.5 w-3.5 ${i < respondingReview.rating ? 'fill-amber-400' : 'fill-gray-200'}`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
              {respondingReview.title && (
                <p className="mt-2 text-sm font-medium text-gray-900">{respondingReview.title}</p>
              )}
              {respondingReview.body && (
                <p className="mt-1 text-sm text-gray-600">{respondingReview.body}</p>
              )}
            </div>

            {/* Response textarea */}
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Your Response</label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write your response to this review..."
                maxLength={2000}
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
              />
              <p className="mt-1 text-xs text-gray-400 text-right">{responseText.length}/2000</p>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setRespondingReview(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRespond}
                disabled={!responseText.trim() || respondMutation.isPending}
                className="flex-1 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {respondMutation.isPending ? 'Submitting...' : 'Submit Response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
