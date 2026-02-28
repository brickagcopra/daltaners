import { HttpResponse } from 'msw';

export function wrap<T>(data: T) {
  return HttpResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

export function paginatedWrap<T>(
  items: T[],
  page: number,
  limit: number,
) {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);

  return HttpResponse.json({
    success: true,
    data: paged,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
    timestamp: new Date().toISOString(),
  });
}

export function cursorWrap<T extends { id: string }>(
  items: T[],
  cursor: string | null,
  limit: number,
) {
  let startIndex = 0;
  if (cursor) {
    const idx = items.findIndex((i) => i.id === cursor);
    if (idx !== -1) startIndex = idx + 1;
  }
  const sliced = items.slice(startIndex, startIndex + limit);
  const nextCursor = sliced.length === limit ? sliced[sliced.length - 1].id : null;

  return HttpResponse.json({
    success: true,
    data: sliced,
    meta: {
      cursor: nextCursor,
      limit,
      hasMore: nextCursor !== null,
      total: items.length,
    },
    timestamp: new Date().toISOString(),
  });
}

export function errorResponse(statusCode: number, code: string, message: string) {
  return HttpResponse.json(
    {
      success: false,
      error: { code, message, details: [], statusCode },
      timestamp: new Date().toISOString(),
    },
    { status: statusCode },
  );
}

export function getSearchParams(request: Request) {
  const url = new URL(request.url);
  return url.searchParams;
}
