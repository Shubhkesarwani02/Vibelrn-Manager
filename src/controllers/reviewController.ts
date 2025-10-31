/**
 * Review Controller - Handles HTTP requests for review endpoints
 */

import { type Request, type Response } from 'express';
import {
  getTrendingCategories,
  getReviewsByCategory,
  getReviewsNeedingLLMProcessing,
  categoryExists,
} from '../services/reviewService.js';
import { validatePaginationParams } from '../utils/pagination.js';
import { logAPIRequest, addBatchToLLMQueue } from '../services/queueService.js';

/**
 * GET /reviews/trends
 * Returns top 5 categories based on average stars (only latest review per review_id)
 */
export async function getReviewTrends(req: Request, res: Response) {
  try {
    // Log request asynchronously via BullMQ
    await logAPIRequest('GET /reviews/trends');

    // Fetch trending categories
    const trends = await getTrendingCategories();

    // Convert BigInt to string for JSON serialization
    const formattedTrends = trends.map((trend) => ({
      category_id: trend.category_id.toString(),
      category_name: trend.category_name,
      average_stars: Number(trend.average_stars.toFixed(2)),
      total_reviews: trend.total_reviews,
    }));

    res.status(200).json({
      success: true,
      data: formattedTrends,
      count: formattedTrends.length,
    });
  } catch (error) {
    console.error('Error fetching review trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch review trends',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /reviews?category_id=<id>&page=<n>&limit=<n>
 * Returns latest reviews for a specific category with pagination
 */
export async function getReviews(req: Request, res: Response) {
  try {
    // Extract and validate category_id
    const categoryIdParam = req.query.category_id as string;
    
    if (!categoryIdParam) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: category_id',
      });
    }

    const categoryId = BigInt(categoryIdParam);

    // Check if category exists
    const exists = await categoryExists(categoryId);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: `Category with id ${categoryId} not found`,
      });
    }

    // Validate pagination parameters
    const { page, limit } = validatePaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    // Log request asynchronously via BullMQ
    await logAPIRequest('GET /reviews', { 
      category_id: categoryId.toString(), 
      page, 
      limit 
    });

    // Fetch reviews with pagination
    const result = await getReviewsByCategory(categoryId, page, limit);

    // Identify reviews needing LLM processing (missing tone or sentiment)
    const reviewsNeedingLLM = result.data.filter(
      (review) => !review.tone || !review.sentiment
    );

    // Queue LLM jobs for reviews missing tone/sentiment
    if (reviewsNeedingLLM.length > 0) {
      const llmJobs = reviewsNeedingLLM
        .filter(review => review.text) // Filter out null texts
        .map(review => ({
          id: review.id.toString(),
          text: review.text!,
          stars: review.stars,
        }));
      
      if (llmJobs.length > 0) {
        await addBatchToLLMQueue(llmJobs);
        console.log(`🤖 Queued ${llmJobs.length} reviews for LLM processing`);
      }
    }

    // Convert BigInt to string for JSON serialization
    const formattedData = result.data.map((review) => ({
      id: review.id.toString(),
      text: review.text,
      stars: review.stars,
      review_id: review.review_id,
      tone: review.tone,
      sentiment: review.sentiment,
      category_id: review.category_id.toString(),
      created_at: review.created_at.toISOString(),
      updated_at: review.updated_at.toISOString(),
      category: {
        id: review.category.id.toString(),
        name: review.category.name,
        description: review.category.description,
      },
      needs_llm_processing: !review.tone || !review.sentiment,
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
      pagination: result.pagination,
      llm_processing_queued: reviewsNeedingLLM.length,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    
    if (error instanceof Error && error.message.includes('Limit must be')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /reviews/pending-llm
 * Returns reviews that need LLM processing (optional utility endpoint)
 */
export async function getPendingLLMReviews(req: Request, res: Response) {
  try {
    const categoryIdParam = req.query.category_id as string;
    const categoryId = categoryIdParam ? BigInt(categoryIdParam) : undefined;

    const reviews = await getReviewsNeedingLLMProcessing(categoryId);

    const formattedReviews = reviews.map((review: any) => ({
      id: review.id.toString(),
      text: review.text,
      stars: review.stars,
      tone: review.tone,
      sentiment: review.sentiment,
    }));

    res.status(200).json({
      success: true,
      data: formattedReviews,
      count: formattedReviews.length,
    });
  } catch (error) {
    console.error('Error fetching pending LLM reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending LLM reviews',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
