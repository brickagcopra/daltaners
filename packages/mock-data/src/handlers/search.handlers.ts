import { http, delay, HttpResponse } from 'msw';
import { getSearchParams } from '../helpers';
import { products } from '../data';
import { categories } from '../data';

const BASE = '/api/v1';

// Build category name lookup from flat + nested categories
function buildCategoryMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const cat of categories) {
    map.set(cat.id, cat.name);
    if ('children' in cat && Array.isArray(cat.children)) {
      for (const child of cat.children) {
        map.set(child.id, child.name);
      }
    }
  }
  return map;
}

const categoryMap = buildCategoryMap();

// Transform a product into an ES-like search document
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSearchDocument(p: any) {
  return {
    id: p.id,
    store_id: p.store_id,
    name: p.name,
    description: p.description,
    short_description: p.short_description,
    category_id: p.category_id,
    category_name: categoryMap.get(p.category_id) ?? null,
    brand: p.brand,
    slug: p.slug,
    base_price: p.base_price,
    sale_price: p.sale_price,
    rating_average: p.rating_average,
    rating_count: p.rating_count,
    total_sold: p.total_sold,
    dietary_tags: p.dietary_tags ?? [],
    is_active: p.is_active,
    is_featured: p.is_featured,
    is_perishable: p.is_perishable,
    requires_prescription: p.requires_prescription,
    image_url: p.images?.[0]?.url ?? null,
    updated_at: p.updated_at,
  };
}

export const searchHandlers = [
  // GET /search — ES-like full-text search with facets
  http.get(`${BASE}/search`, async ({ request }) => {
    await delay(200);
    const params = getSearchParams(request);
    const q = params.get('q')?.toLowerCase() ?? '';
    const categoryId = params.get('category_id');
    const storeId = params.get('store_id');
    const brand = params.get('brand');
    const minPrice = params.get('min_price') ? parseFloat(params.get('min_price')!) : null;
    const maxPrice = params.get('max_price') ? parseFloat(params.get('max_price')!) : null;
    const dietaryTags = params.get('dietary_tags')?.split(',').filter(Boolean) ?? [];
    const sortBy = params.get('sort_by') ?? '_score';
    const sortOrder = params.get('sort_order') ?? 'desc';
    const page = parseInt(params.get('page') ?? '0', 10);
    const size = parseInt(params.get('size') ?? '20', 10);

    let filtered = products.filter((p) => p.is_active);

    // Text search (simple includes matching)
    if (q) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.short_description && p.short_description.toLowerCase().includes(q)),
      );
    }

    // Filters
    if (categoryId) {
      // Match exact ID or child categories (e.g. 'cat-001' matches 'cat-001-a', 'cat-001-b')
      filtered = filtered.filter((p) => p.category_id === categoryId || p.category_id.startsWith(categoryId + '-'));
    }
    if (storeId) {
      filtered = filtered.filter((p) => p.store_id === storeId);
    }
    if (brand) {
      filtered = filtered.filter((p) => p.brand === brand);
    }
    if (minPrice !== null) {
      filtered = filtered.filter((p) => p.base_price >= minPrice);
    }
    if (maxPrice !== null) {
      filtered = filtered.filter((p) => p.base_price <= maxPrice);
    }
    if (dietaryTags.length > 0) {
      filtered = filtered.filter((p) =>
        dietaryTags.some((tag) => p.dietary_tags?.includes(tag)),
      );
    }

    // Sorting
    if (sortBy === 'base_price') {
      filtered.sort((a, b) =>
        sortOrder === 'asc' ? a.base_price - b.base_price : b.base_price - a.base_price,
      );
    } else if (sortBy === 'rating_average') {
      filtered.sort((a, b) => b.rating_average - a.rating_average);
    } else if (sortBy === 'total_sold') {
      filtered.sort((a, b) => b.total_sold - a.total_sold);
    } else if (sortBy === 'created_at') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Build aggregations from filtered results
    const categoryBuckets: Record<string, number> = {};
    const brandBuckets: Record<string, number> = {};
    const dietaryBuckets: Record<string, number> = {};
    let priceMin = Infinity;
    let priceMax = -Infinity;
    let priceSum = 0;

    for (const p of filtered) {
      const catName = categoryMap.get(p.category_id) ?? 'Other';
      categoryBuckets[catName] = (categoryBuckets[catName] ?? 0) + 1;

      const brandName = p.brand ?? 'Unknown';
      brandBuckets[brandName] = (brandBuckets[brandName] ?? 0) + 1;

      for (const tag of p.dietary_tags ?? []) {
        dietaryBuckets[tag] = (dietaryBuckets[tag] ?? 0) + 1;
      }

      if (p.base_price < priceMin) priceMin = p.base_price;
      if (p.base_price > priceMax) priceMax = p.base_price;
      priceSum += p.base_price;
    }

    const total = filtered.length;
    const start = page * size;
    const paged = filtered.slice(start, start + size).map(toSearchDocument);

    return HttpResponse.json({
      success: true,
      data: paged,
      meta: {
        total,
        page,
        size,
        total_pages: Math.ceil(total / size),
      },
      aggregations: {
        categories: {
          buckets: Object.entries(categoryBuckets)
            .map(([key, doc_count]) => ({ key, doc_count }))
            .sort((a, b) => b.doc_count - a.doc_count),
        },
        brands: {
          buckets: Object.entries(brandBuckets)
            .map(([key, doc_count]) => ({ key, doc_count }))
            .sort((a, b) => b.doc_count - a.doc_count),
        },
        price_range: {
          min: priceMin === Infinity ? 0 : priceMin,
          max: priceMax === -Infinity ? 0 : priceMax,
          avg: total > 0 ? priceSum / total : 0,
        },
        dietary_tags: {
          buckets: Object.entries(dietaryBuckets)
            .map(([key, doc_count]) => ({ key, doc_count }))
            .sort((a, b) => b.doc_count - a.doc_count),
        },
      },
      timestamp: new Date().toISOString(),
    });
  }),

  // GET /search/suggest — autocomplete suggestions
  http.get(`${BASE}/search/suggest`, async ({ request }) => {
    await delay(100);
    const params = getSearchParams(request);
    const q = params.get('q')?.toLowerCase() ?? '';
    const size = parseInt(params.get('size') ?? '8', 10);

    if (!q || q.length < 2) {
      return HttpResponse.json({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });
    }

    // Find unique product names matching the query prefix
    const seen = new Set<string>();
    const suggestions: string[] = [];
    for (const p of products) {
      if (!p.is_active) continue;
      const name = p.name;
      if (name.toLowerCase().includes(q) && !seen.has(name)) {
        seen.add(name);
        suggestions.push(name);
        if (suggestions.length >= size) break;
      }
    }

    return HttpResponse.json({
      success: true,
      data: suggestions,
      timestamp: new Date().toISOString(),
    });
  }),
];
