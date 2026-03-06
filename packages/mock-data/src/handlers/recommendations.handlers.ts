import { http } from 'msw';
import { wrap, getSearchParams } from '../helpers';
import { products } from '../data/products';

function toRecommendedProduct(p: (typeof products)[0]) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    base_price: p.base_price,
    sale_price: p.sale_price,
    rating_average: p.rating_average,
    rating_count: p.rating_count,
    total_sold: p.total_sold,
    store_id: p.store_id,
    category_id: p.category_id,
    primary_image_url: p.images[0]?.url || null,
  };
}

export const recommendationsHandlers = [
  // GET /api/v1/recommendations/popular
  http.get('/api/v1/recommendations/popular', ({ request }) => {
    const params = getSearchParams(request);
    const storeId = params.get('store_id');
    const categoryId = params.get('category_id');
    const limit = parseInt(params.get('limit') || '8', 10);

    let filtered = [...products].filter((p) => p.is_active);

    if (storeId) {
      filtered = filtered.filter((p) => p.store_id === storeId);
    }
    if (categoryId) {
      filtered = filtered.filter((p) => p.category_id === categoryId);
    }

    // Sort by total_sold descending
    filtered.sort((a, b) => b.total_sold - a.total_sold);

    const result = filtered.slice(0, limit).map(toRecommendedProduct);
    return wrap(result);
  }),

  // GET /api/v1/recommendations/together/:productId
  http.get('/api/v1/recommendations/together/:productId', ({ params, request }) => {
    const productId = params.productId as string;
    const searchParams = getSearchParams(request);
    const limit = parseInt(searchParams.get('limit') || '8', 10);

    const sourceProduct = products.find((p) => p.id === productId);
    if (!sourceProduct) {
      return wrap([]);
    }

    // Mock: return products from the same store, excluding the source product
    const together = products
      .filter((p) => p.store_id === sourceProduct.store_id && p.id !== productId && p.is_active)
      .sort((a, b) => b.total_sold - a.total_sold)
      .slice(0, limit)
      .map(toRecommendedProduct);

    return wrap(together);
  }),

  // GET /api/v1/recommendations/similar/:productId
  http.get('/api/v1/recommendations/similar/:productId', ({ params, request }) => {
    const productId = params.productId as string;
    const searchParams = getSearchParams(request);
    const limit = parseInt(searchParams.get('limit') || '8', 10);

    const sourceProduct = products.find((p) => p.id === productId);
    if (!sourceProduct) {
      return wrap([]);
    }

    // Mock: return products from the same category, excluding the source product
    const similar = products
      .filter((p) => p.category_id === sourceProduct.category_id && p.id !== productId && p.is_active)
      .sort((a, b) => b.rating_average - a.rating_average)
      .slice(0, limit)
      .map(toRecommendedProduct);

    return wrap(similar);
  }),

  // GET /api/v1/recommendations/personalized
  http.get('/api/v1/recommendations/personalized', ({ request }) => {
    const searchParams = getSearchParams(request);
    const limit = parseInt(searchParams.get('limit') || '8', 10);

    // Mock: return featured + high-rated products
    const personalized = products
      .filter((p) => p.is_active)
      .sort((a, b) => {
        // Prioritize featured, then by rating
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return b.rating_average - a.rating_average;
      })
      .slice(0, limit)
      .map(toRecommendedProduct);

    return wrap(personalized);
  }),
];
