/**
 * Pagination utility for calculating skip/take and metadata
 */

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Calculate skip and take values for Prisma pagination
 */
export function calculatePagination(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const take = limit;
  return { skip, take };
}

/**
 * Build pagination metadata
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  totalCount: number
): PaginationMeta {
  const totalPages = Math.ceil(totalCount / limit);

  return {
    page,
    limit,
    totalPages,
    totalCount,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  page?: string | number,
  limit?: string | number
): PaginationParams {
  const parsedPage = typeof page === 'string' ? parseInt(page, 10) : (page ?? 1);
  const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : (limit ?? 15);

  // Validate page
  if (isNaN(parsedPage) || parsedPage < 1) {
    throw new Error('Page must be a positive integer');
  }

  // Validate limit (max 100)
  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new Error('Limit must be between 1 and 100');
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
  };
}
