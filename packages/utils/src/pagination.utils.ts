export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface OffsetPagination {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export function getOffsetPagination(params: PaginationParams): OffsetPagination {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  };
}

export function buildPaginationMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
}

export function encodeCursor(id: string, createdAt: string): string {
  return Buffer.from(`${id}:${createdAt}`).toString('base64');
}

export function decodeCursor(cursor: string): { id: string; createdAt: string } {
  const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
  const [id, createdAt] = decoded.split(':');
  return { id, createdAt };
}
