import { http, HttpResponse, delay } from 'msw';
import { reviews, reviewHelpfulVotes, MockReview } from '../data/reviews';
import { wrap, paginatedWrap, cursorWrap, errorResponse, getSearchParams } from '../helpers';

const BASE = '/api/v1';
let localReviews = [...reviews];
let localVotes = [...reviewHelpfulVotes];

// Shared handler logic for listing reviews (cursor-paginated)
async function handleListReviews(request: Request) {
  await delay(200);
  const params = getSearchParams(request);
  const reviewable_type = params.get('reviewable_type');
  const reviewable_id = params.get('reviewable_id');
  const rating = params.get('rating');
  const sort_by = params.get('sort_by') || 'created_at';
  const sort_order = params.get('sort_order') || 'DESC';
  const cursor = params.get('cursor');
  const limit = parseInt(params.get('limit') || '10', 10);

  let filtered = localReviews.filter((r) => r.is_approved);
  if (reviewable_type) filtered = filtered.filter((r) => r.reviewable_type === reviewable_type);
  if (reviewable_id) filtered = filtered.filter((r) => r.reviewable_id === reviewable_id);
  if (rating) filtered = filtered.filter((r) => r.rating === parseInt(rating, 10));

  filtered.sort((a, b) => {
    const key = sort_by as keyof MockReview;
    const aVal = a[key] as string | number;
    const bVal = b[key] as string | number;
    if (sort_order === 'ASC') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  return cursorWrap(filtered, cursor, limit);
}

// Shared handler logic for review stats
async function handleReviewStats(request: Request) {
  await delay(150);
  const params = getSearchParams(request);
  const reviewable_type = params.get('reviewable_type');
  const reviewable_id = params.get('reviewable_id');

  if (!reviewable_type || !reviewable_id) {
    return errorResponse(400, 'VALIDATION_ERROR', 'reviewable_type and reviewable_id are required');
  }

  const filtered = localReviews.filter(
    (r) => r.is_approved && r.reviewable_type === reviewable_type && r.reviewable_id === reviewable_id,
  );

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  for (const r of filtered) {
    distribution[r.rating]++;
    total += r.rating;
  }

  return wrap({
    average: filtered.length > 0 ? Math.round((total / filtered.length) * 10) / 10 : 0,
    count: filtered.length,
    distribution,
  });
}

// Shared handler logic for single review
async function handleGetReview(id: string | readonly string[] | undefined) {
  await delay(150);
  const review = localReviews.find((r) => r.id === id);
  if (!review) return errorResponse(404, 'REVIEW_NOT_FOUND', 'Review not found');
  return wrap(review);
}

// Shared handler logic for creating review
async function handleCreateReview(request: Request) {
  await delay(300);
  const body = (await request.json()) as Record<string, unknown>;
  const newReview: MockReview = {
    id: `rev-${String(localReviews.length + 1).padStart(3, '0')}`,
    user_id: 'u-cust-001',
    user_name: 'Maria S.',
    user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
    order_id: (body.order_id as string) || null,
    reviewable_type: body.reviewable_type as MockReview['reviewable_type'],
    reviewable_id: body.reviewable_id as string,
    reviewable_name: 'Item',
    rating: body.rating as number,
    title: (body.title as string) || null,
    body: (body.body as string) || null,
    images: (body.images as string[]) || [],
    is_verified_purchase: !!body.order_id,
    is_approved: true,
    vendor_response: null,
    vendor_response_at: null,
    helpful_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localReviews.unshift(newReview);
  return HttpResponse.json(
    { success: true, data: newReview, timestamp: new Date().toISOString() },
    { status: 201 },
  );
}

// Shared handler logic for toggling helpful
async function handleToggleHelpful(id: string | readonly string[] | undefined) {
  await delay(150);
  const reviewId = id as string;
  const review = localReviews.find((r) => r.id === reviewId);
  if (!review) return errorResponse(404, 'REVIEW_NOT_FOUND', 'Review not found');

  const userId = 'u-cust-001';
  const existing = localVotes.findIndex((v) => v.review_id === reviewId && v.user_id === userId);
  let helpful: boolean;
  if (existing !== -1) {
    localVotes.splice(existing, 1);
    review.helpful_count = Math.max(0, review.helpful_count - 1);
    helpful = false;
  } else {
    localVotes.push({ review_id: reviewId, user_id: userId });
    review.helpful_count++;
    helpful = true;
  }
  return wrap({ helpful });
}

// Shared handler logic for deleting review
async function handleDeleteReview(id: string | readonly string[] | undefined) {
  await delay(200);
  const idx = localReviews.findIndex((r) => r.id === id);
  if (idx === -1) return errorResponse(404, 'REVIEW_NOT_FOUND', 'Review not found');
  localReviews.splice(idx, 1);
  return new HttpResponse(null, { status: 204 });
}

export const reviewsHandlers = [
  // ---- Frontend convention: /api/v1/reviews (used by customer-web) ----

  // Public: GET /reviews — cursor-paginated
  http.get(`${BASE}/reviews`, ({ request }) => handleListReviews(request)),

  // Public: GET /reviews/stats
  http.get(`${BASE}/reviews/stats`, ({ request }) => handleReviewStats(request)),

  // Public: GET /reviews/:id
  http.get(`${BASE}/reviews/:id`, ({ params }) => handleGetReview(params.id)),

  // Customer: POST /reviews — create review
  http.post(`${BASE}/reviews`, ({ request }) => handleCreateReview(request)),

  // Customer: POST /reviews/:id/helpful — toggle helpful
  http.post(`${BASE}/reviews/:id/helpful`, ({ params }) => handleToggleHelpful(params.id)),

  // Customer: DELETE /reviews/:id
  http.delete(`${BASE}/reviews/:id`, ({ params }) => handleDeleteReview(params.id)),

  // ---- Backend convention: /api/v1/catalog/reviews (used by vendor/admin apps) ----

  // Public: GET /catalog/reviews — cursor-paginated
  http.get(`${BASE}/catalog/reviews`, ({ request }) => handleListReviews(request)),

  // Public: GET /catalog/reviews/stats
  http.get(`${BASE}/catalog/reviews/stats`, ({ request }) => handleReviewStats(request)),

  // Public: GET /catalog/reviews/:id
  http.get(`${BASE}/catalog/reviews/:id`, ({ params }) => handleGetReview(params.id)),

  // Customer: POST /catalog/reviews — create review
  http.post(`${BASE}/catalog/reviews`, ({ request }) => handleCreateReview(request)),

  // Customer: POST /catalog/reviews/:id/helpful — toggle helpful
  http.post(`${BASE}/catalog/reviews/:id/helpful`, ({ params }) => handleToggleHelpful(params.id)),

  // Customer: DELETE /catalog/reviews/:id
  http.delete(`${BASE}/catalog/reviews/:id`, ({ params }) => handleDeleteReview(params.id)),

  // Vendor: GET /catalog/reviews/vendor/my-reviews — offset paginated
  http.get(`${BASE}/catalog/reviews/vendor/my-reviews`, async ({ request }) => {
    await delay(200);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') || '1', 10);
    const limit = parseInt(params.get('limit') || '20', 10);

    // Mock: return reviews for store-001 (vendor-001's store) + its products
    const vendorStoreIds = ['store-001'];
    const vendorProductIds = ['prod-001', 'prod-003', 'prod-005', 'prod-007', 'prod-010'];

    const filtered = localReviews.filter(
      (r) =>
        (r.reviewable_type === 'store' && vendorStoreIds.includes(r.reviewable_id)) ||
        (r.reviewable_type === 'product' && vendorProductIds.includes(r.reviewable_id)),
    );

    return paginatedWrap(filtered, page, limit);
  }),

  // Vendor: POST /catalog/reviews/:id/response — vendor respond
  http.post(`${BASE}/catalog/reviews/:id/response`, async ({ params, request }) => {
    await delay(200);
    const { id } = params;
    const body = (await request.json()) as { response: string };
    const review = localReviews.find((r) => r.id === id);
    if (!review) return errorResponse(404, 'REVIEW_NOT_FOUND', 'Review not found');

    review.vendor_response = body.response;
    review.vendor_response_at = new Date().toISOString();
    review.updated_at = new Date().toISOString();
    return wrap(review);
  }),

  // Admin: GET /catalog/reviews/admin/all — offset paginated
  http.get(`${BASE}/catalog/reviews/admin/all`, async ({ request }) => {
    await delay(200);
    const params = getSearchParams(request);
    const page = parseInt(params.get('page') || '1', 10);
    const limit = parseInt(params.get('limit') || '20', 10);
    const search = params.get('search')?.toLowerCase();
    const reviewable_type = params.get('reviewable_type');
    const is_approved = params.get('is_approved');
    const rating = params.get('rating');

    let filtered = [...localReviews];
    if (search) {
      filtered = filtered.filter(
        (r) =>
          (r.title && r.title.toLowerCase().includes(search)) ||
          (r.body && r.body.toLowerCase().includes(search)) ||
          r.user_name.toLowerCase().includes(search),
      );
    }
    if (reviewable_type) filtered = filtered.filter((r) => r.reviewable_type === reviewable_type);
    if (is_approved !== null && is_approved !== undefined && is_approved !== '') {
      filtered = filtered.filter((r) => r.is_approved === (is_approved === 'true'));
    }
    if (rating) filtered = filtered.filter((r) => r.rating === parseInt(rating, 10));

    return paginatedWrap(filtered, page, limit);
  }),

  // Admin: POST /catalog/reviews/admin/:id/approve
  http.post(`${BASE}/catalog/reviews/admin/:id/approve`, async ({ params }) => {
    await delay(200);
    const { id } = params;
    const review = localReviews.find((r) => r.id === id);
    if (!review) return errorResponse(404, 'REVIEW_NOT_FOUND', 'Review not found');
    review.is_approved = true;
    review.updated_at = new Date().toISOString();
    return wrap(review);
  }),

  // Admin: POST /catalog/reviews/admin/:id/reject
  http.post(`${BASE}/catalog/reviews/admin/:id/reject`, async ({ params }) => {
    await delay(200);
    const { id } = params;
    const review = localReviews.find((r) => r.id === id);
    if (!review) return errorResponse(404, 'REVIEW_NOT_FOUND', 'Review not found');
    review.is_approved = false;
    review.updated_at = new Date().toISOString();
    return wrap(review);
  }),

  // Admin: DELETE /catalog/reviews/admin/:id
  http.delete(`${BASE}/catalog/reviews/admin/:id`, async ({ params }) => {
    await delay(200);
    const { id } = params;
    const idx = localReviews.findIndex((r) => r.id === id);
    if (idx === -1) return errorResponse(404, 'REVIEW_NOT_FOUND', 'Review not found');
    localReviews.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
