/**
 * Review Service - Business logic for review-related operations
 * Handles Prisma queries for trends and category-filtered reviews
 */

import prisma from '../utils/prismaClient.js';
import {
  calculatePagination,
  buildPaginationMeta,
  type PaginatedResponse,
} from '../utils/pagination.js';

/**
 * Interface for trending category data
 */
export interface TrendingCategory {
  category_id: bigint;
  category_name: string;
  average_stars: number;
  total_reviews: number;
}

/**
 * Interface for review data
 */
export interface ReviewData {
  id: bigint;
  text: string | null;
  stars: number;
  review_id: string;
  tone: string | null;
  sentiment: string | null;
  category_id: bigint;
  created_at: Date;
  updated_at: Date;
  category: {
    id: bigint;
    name: string;
    description: string | null;
  };
}

/**
 * GET /reviews/trends
 * Fetch top 5 categories based on average stars (only latest review per review_id)
 */
export async function getTrendingCategories(): Promise<TrendingCategory[]> {
  // Step 1: Get latest review for each review_id using a subquery approach
  // We'll use Prisma's raw query for complex aggregation

  const trends = await prisma.$queryRaw<TrendingCategory[]>`
    WITH LatestReviews AS (
      SELECT 
        rh.*,
        ROW_NUMBER() OVER (PARTITION BY rh.review_id ORDER BY rh.created_at DESC) as rn
      FROM "ReviewHistory" rh
    )
    SELECT 
      lr.category_id,
      c.name as category_name,
      AVG(lr.stars)::FLOAT as average_stars,
      COUNT(*)::INT as total_reviews
    FROM LatestReviews lr
    INNER JOIN "Category" c ON c.id = lr.category_id
    WHERE lr.rn = 1
    GROUP BY lr.category_id, c.name
    ORDER BY average_stars DESC
    LIMIT 5
  `;

  return trends;
}

/**
 * GET /reviews?category_id=<id>
 * Fetch latest reviews for a specific category with pagination
 * Returns reviews that need LLM processing (missing tone/sentiment)
 */
export async function getReviewsByCategory(
  categoryId: bigint,
  page: number,
  limit: number
): Promise<PaginatedResponse<ReviewData>> {
  // Step 1: Get latest review IDs for this category
  const latestReviewIds = await prisma.$queryRaw<{ review_id: string }[]>`
    SELECT DISTINCT ON (review_id) review_id
    FROM "ReviewHistory"
    WHERE category_id = ${categoryId}
    ORDER BY review_id, created_at DESC
  `;

  const reviewIds = latestReviewIds.map((r: { review_id: string }) => r.review_id);

  // Step 2: Count total unique reviews for pagination
  const totalCount = reviewIds.length;

  // Step 3: Calculate pagination
  const { skip, take } = calculatePagination(page, limit);

  // Step 4: Get paginated review IDs
  const paginatedReviewIds = reviewIds.slice(skip, skip + take);

  // Step 5: Fetch full review data for paginated IDs
  const reviews = await prisma.reviewHistory.findMany({
    where: {
      review_id: {
        in: paginatedReviewIds,
      },
      category_id: categoryId,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  // Step 6: Get only the latest version for each review_id
  type ReviewWithCategory = typeof reviews[number];
  
  const latestReviews = reviews.reduce((acc: ReviewWithCategory[], review: ReviewWithCategory) => {
    const existing = acc.find((r: ReviewWithCategory) => r.review_id === review.review_id);
    if (!existing || review.created_at > existing.created_at) {
      // Remove old version if exists
      const filtered = acc.filter((r: ReviewWithCategory) => r.review_id !== review.review_id);
      return [...filtered, review];
    }
    return acc;
  }, [] as ReviewWithCategory[]);

  // Step 7: Sort by created_at DESC
  latestReviews.sort((a: ReviewWithCategory, b: ReviewWithCategory) => 
    b.created_at.getTime() - a.created_at.getTime()
  );

  // Step 8: Build pagination metadata
  const paginationMeta = buildPaginationMeta(page, limit, totalCount);

  return {
    data: latestReviews as ReviewData[],
    pagination: paginationMeta,
  };
}

/**
 * Get reviews that need LLM processing (missing tone or sentiment)
 * Used by LLM queue to identify reviews to process
 */
export async function getReviewsNeedingLLMProcessing(categoryId?: bigint) {
  const where = {
    OR: [{ tone: null }, { sentiment: null }],
    ...(categoryId && { category_id: categoryId }),
  };

  return await prisma.reviewHistory.findMany({
    where,
    select: {
      id: true,
      text: true,
      stars: true,
      tone: true,
      sentiment: true,
    },
    take: 50, // Process in batches
  });
}

/**
 * Check if a category exists
 */
export async function categoryExists(categoryId: bigint): Promise<boolean> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  return category !== null;
}
