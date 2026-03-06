import { http, delay } from 'msw';
import { cursorWrap, wrap, errorResponse, getSearchParams } from '../helpers';
import { products, productsByStore } from '../data';

const BASE = '/api/v1';

export const productsHandlers = [
  // GET /products — cursor-based pagination with filters
  http.get(`${BASE}/products`, async ({ request }) => {
    await delay(250);
    const params = getSearchParams(request);
    const cursor = params.get('cursor');
    const limit = parseInt(params.get('limit') ?? '20', 10);
    const search = params.get('search')?.toLowerCase();
    const categoryId = params.get('category_id');
    const storeId = params.get('store_id');
    const minPrice = params.get('min_price') ? parseFloat(params.get('min_price')!) : null;
    const maxPrice = params.get('max_price') ? parseFloat(params.get('max_price')!) : null;
    const sortBy = params.get('sort_by');

    let filtered = [...products];

    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          (p.brand !== null && p.brand.toLowerCase().includes(search)),
      );
    }
    if (categoryId) {
      // Match exact ID or child categories (e.g. 'cat-001' matches 'cat-001-a', 'cat-001-b')
      filtered = filtered.filter((p) => p.category_id === categoryId || p.category_id.startsWith(categoryId + '-'));
    }
    if (storeId) {
      filtered = filtered.filter((p) => p.store_id === storeId);
    }
    if (minPrice !== null) {
      filtered = filtered.filter((p) => p.base_price >= minPrice);
    }
    if (maxPrice !== null) {
      filtered = filtered.filter((p) => p.base_price <= maxPrice);
    }

    const sortOrder = params.get('sort_order')?.toUpperCase();
    if (sortBy === 'price_asc' || (sortBy === 'base_price' && sortOrder === 'ASC')) {
      filtered.sort((a, b) => a.base_price - b.base_price);
    } else if (sortBy === 'price_desc' || (sortBy === 'base_price' && sortOrder === 'DESC')) {
      filtered.sort((a, b) => b.base_price - a.base_price);
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => b.rating_average - a.rating_average);
    } else if (sortBy === 'popular' || sortBy === 'total_sold') {
      filtered.sort((a, b) => b.total_sold - a.total_sold);
    } else if (sortBy === 'created_at') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return cursorWrap(filtered, cursor, limit);
  }),

  // GET /products/:id — match by id or slug
  http.get(`${BASE}/products/:id`, async ({ params }) => {
    await delay(200);
    const idOrSlug = params.id as string;
    const product = products.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
    if (!product) {
      return errorResponse(404, 'NOT_FOUND', 'Product not found');
    }
    return wrap(product);
  }),

  // GET /stores/:storeId/products
  http.get(`${BASE}/stores/:storeId/products`, async ({ params, request }) => {
    await delay(250);
    const sp = getSearchParams(request);
    const page = parseInt(sp.get('page') ?? '1', 10);
    const limit = parseInt(sp.get('limit') ?? '20', 10);
    const search = sp.get('search')?.toLowerCase();
    const category = sp.get('category');
    const isActive = sp.get('isActive');

    let storeProducts = productsByStore(params.storeId as string);

    if (search) {
      storeProducts = storeProducts.filter(
        (p) => p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search),
      );
    }
    if (category) {
      storeProducts = storeProducts.filter((p) => p.category_id === category);
    }
    if (isActive !== null && isActive !== undefined) {
      const active = isActive === 'true';
      storeProducts = storeProducts.filter((p) => p.is_active === active);
    }

    const total = storeProducts.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = storeProducts.slice(start, start + limit);

    return wrap({
      items: paged,
      meta: { page, limit, total, totalPages, hasMore: page < totalPages },
    });
  }),
];
