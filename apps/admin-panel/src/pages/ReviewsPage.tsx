import { useState } from 'react';
import { useAdminReviews, useApproveReview, useRejectReview, useDeleteAdminReview } from '@/hooks/useReviews';
import type { Review } from '@/hooks/useReviews';

export function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [reviewableType, setReviewableType] = useState('');
  const [isApproved, setIsApproved] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading } = useAdminReviews({
    page,
    limit: 20,
    search: search || undefined,
    reviewable_type: reviewableType || undefined,
    is_approved: isApproved,
    rating: ratingFilter || undefined,
  });

  const approveMutation = useApproveReview();
  const rejectMutation = useRejectReview();
  const deleteMutation = useDeleteAdminReview();

  const reviews = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta;

  const typeLabel = (type: string) => {
    switch (type) {
      case 'store': return 'Store';
      case 'product': return 'Product';
      case 'delivery_personnel': return 'Delivery';
      default: return type;
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => setDeleteConfirm(null),
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Review Moderation</h1>
        <p className="text-sm text-gray-500">
          Manage and moderate user reviews across the platform
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search reviews..."
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
        />
        <select
          value={reviewableType}
          onChange={(e) => { setReviewableType(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="store">Store</option>
          <option value="product">Product</option>
          <option value="delivery_personnel">Delivery</option>
        </select>
        <select
          value={isApproved}
          onChange={(e) => { setIsApproved(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="true">Approved</option>
          <option value="false">Pending/Rejected</option>
        </select>
        <select
          value={ratingFilter}
          onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
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
                    No reviews found matching your filters.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src={review.user_avatar} alt="" className="h-8 w-8 rounded-full bg-gray-100" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{review.user_name}</p>
                          <p className="text-xs text-gray-400 font-mono">{review.id.slice(0, 8)}</p>
                        </div>
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
                      <button
                        onClick={() => setSelectedReview(review)}
                        className="text-left hover:text-blue-600"
                      >
                        {review.title && (
                          <p className="text-sm font-medium text-gray-900 truncate">{review.title}</p>
                        )}
                        <p className="text-sm text-gray-500 truncate">
                          {review.body || '(No text)'}
                        </p>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {review.is_approved ? (
                        <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(review.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!review.is_approved && (
                          <button
                            onClick={() => approveMutation.mutate(review.id)}
                            disabled={approveMutation.isPending}
                            className="text-sm font-medium text-green-600 hover:text-green-700"
                          >
                            Approve
                          </button>
                        )}
                        {review.is_approved && (
                          <button
                            onClick={() => rejectMutation.mutate(review.id)}
                            disabled={rejectMutation.isPending}
                            className="text-sm font-medium text-yellow-600 hover:text-yellow-700"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(review.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
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

      {/* Review Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Review Detail</h3>
              <button onClick={() => setSelectedReview(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Reviewer */}
              <div className="flex items-center gap-3">
                <img src={selectedReview.user_avatar} alt="" className="h-10 w-10 rounded-full" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedReview.user_name}</p>
                  <p className="text-xs text-gray-400">ID: {selectedReview.user_id}</p>
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Type:</span>{' '}
                  <span className="font-medium">{typeLabel(selectedReview.reviewable_type)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Target ID:</span>{' '}
                  <span className="font-mono text-xs">{selectedReview.reviewable_id.slice(0, 12)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>{' '}
                  <span className={`font-medium ${selectedReview.is_approved ? 'text-green-600' : 'text-yellow-600'}`}>
                    {selectedReview.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Verified:</span>{' '}
                  <span className="font-medium">{selectedReview.is_verified_purchase ? 'Yes' : 'No'}</span>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`h-5 w-5 ${i < selectedReview.rating ? 'fill-amber-400' : 'fill-gray-200'}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="text-sm text-gray-500">({selectedReview.helpful_count} helpful)</span>
              </div>

              {/* Content */}
              {selectedReview.title && (
                <h4 className="text-base font-semibold text-gray-900">{selectedReview.title}</h4>
              )}
              {selectedReview.body && (
                <p className="text-sm text-gray-700 whitespace-pre-line">{selectedReview.body}</p>
              )}

              {/* Images */}
              {selectedReview.images.length > 0 && (
                <div className="flex gap-2">
                  {selectedReview.images.map((img, idx) => (
                    <img key={idx} src={img} alt="" className="h-24 w-24 rounded-lg object-cover border" />
                  ))}
                </div>
              )}

              {/* Vendor response */}
              {selectedReview.vendor_response && (
                <div className="rounded-lg bg-gray-50 p-3 border-l-2 border-blue-400">
                  <p className="text-xs font-semibold text-gray-700">Vendor Response</p>
                  <p className="mt-1 text-sm text-gray-600">{selectedReview.vendor_response}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                {!selectedReview.is_approved ? (
                  <button
                    onClick={() => {
                      approveMutation.mutate(selectedReview.id);
                      setSelectedReview(null);
                    }}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Approve
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      rejectMutation.mutate(selectedReview.id);
                      setSelectedReview(null);
                    }}
                    className="flex-1 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600"
                  >
                    Reject
                  </button>
                )}
                <button
                  onClick={() => {
                    setDeleteConfirm(selectedReview.id);
                    setSelectedReview(null);
                  }}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Review</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to permanently delete this review? This action cannot be undone.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
