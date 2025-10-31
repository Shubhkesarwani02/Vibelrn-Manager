/**
 * Review Routes - Defines HTTP endpoints for review operations
 */

import { Router } from 'express';
import {
  getReviewTrends,
  getReviews,
  getPendingLLMReviews,
} from '../controllers/reviewController.js';

const router = Router();

/**
 * @route   GET /reviews/trends
 * @desc    Get top 5 trending categories by average stars
 * @access  Public
 * @returns { success, data: [{ category_id, category_name, average_stars, total_reviews }], count }
 */
router.get('/trends', getReviewTrends);

/**
 * @route   GET /reviews
 * @desc    Get latest reviews for a category with pagination
 * @access  Public
 * @query   category_id (required) - Category ID to filter by
 * @query   page (optional) - Page number (default: 1)
 * @query   limit (optional) - Items per page (default: 15, max: 100)
 * @returns { success, data: [...reviews], pagination: {...}, llm_processing_queued }
 */
router.get('/', getReviews);

/**
 * @route   GET /reviews/pending-llm
 * @desc    Get reviews that need LLM processing (utility endpoint)
 * @access  Public
 * @query   category_id (optional) - Filter by category
 * @returns { success, data: [...reviews], count }
 */
router.get('/pending-llm', getPendingLLMReviews);

export default router;
