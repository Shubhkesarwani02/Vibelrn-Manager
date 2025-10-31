/**
 * Queue Service - Provides helper functions for adding jobs to BullMQ queues
 * Centralizes queue interaction logic
 */

import { logQueue, llmQueue } from '../config/bullmq.js';

export interface LLMJobData {
  id: string;
  text: string;
  stars: number;
}

export interface LogJobData {
  message: string;
}

/**
 * Add a job to the LLM queue for tone/sentiment analysis
 */
export async function addToLLMQueue(data: LLMJobData): Promise<void> {
  try {
    await llmQueue.add('process-review', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
    
    console.log(`📤 Queued review ${data.id} for LLM processing`);
  } catch (error) {
    console.error(`❌ Failed to queue review ${data.id} for LLM:`, error);
    throw error;
  }
}

/**
 * Add multiple jobs to the LLM queue in batch
 */
export async function addBatchToLLMQueue(items: LLMJobData[]): Promise<void> {
  try {
    const jobs = items.map(data => ({
      name: 'process-review',
      data,
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential' as const,
          delay: 2000,
        },
      },
    }));

    await llmQueue.addBulk(jobs);
    console.log(`📤 Queued ${items.length} reviews for LLM processing`);
  } catch (error) {
    console.error('❌ Failed to batch queue reviews for LLM:', error);
    throw error;
  }
}

/**
 * Add a job to the log queue for access logging
 */
export async function addToLogQueue(data: LogJobData): Promise<void> {
  try {
    await logQueue.add('log-request', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
    
    // Don't log every single log job to avoid console spam
    // console.log(`📝 Queued log: ${data.message}`);
  } catch (error) {
    console.error('❌ Failed to queue log:', error);
    // Don't throw - logging should not break the main flow
  }
}

/**
 * Helper to create standardized log messages
 */
export function createLogMessage(endpoint: string, params?: Record<string, any>): string {
  const timestamp = new Date().toISOString();
  const paramsString = params 
    ? ' ' + Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&')
    : '';
  
  return `${endpoint}${paramsString} - ${timestamp}`;
}

/**
 * Log an API request
 */
export async function logAPIRequest(endpoint: string, params?: Record<string, any>): Promise<void> {
  const message = createLogMessage(endpoint, params);
  await addToLogQueue({ message });
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  try {
    const [llmCounts, logCounts] = await Promise.all([
      llmQueue.getJobCounts(),
      logQueue.getJobCounts(),
    ]);

    return {
      llmQueue: {
        waiting: llmCounts.waiting,
        active: llmCounts.active,
        completed: llmCounts.completed,
        failed: llmCounts.failed,
      },
      logQueue: {
        waiting: logCounts.waiting,
        active: logCounts.active,
        completed: logCounts.completed,
        failed: logCounts.failed,
      },
    };
  } catch (error) {
    console.error('❌ Failed to get queue stats:', error);
    throw error;
  }
}

/**
 * Clear all completed and failed jobs from queues
 */
export async function cleanQueues(): Promise<void> {
  try {
    await Promise.all([
      llmQueue.clean(0, 1000, 'completed'),
      llmQueue.clean(0, 1000, 'failed'),
      logQueue.clean(0, 1000, 'completed'),
      logQueue.clean(0, 1000, 'failed'),
    ]);
    
    console.log('🧹 Queues cleaned');
  } catch (error) {
    console.error('❌ Failed to clean queues:', error);
    throw error;
  }
}

/**
 * Pause both queues (useful for maintenance)
 */
export async function pauseQueues(): Promise<void> {
  await Promise.all([
    llmQueue.pause(),
    logQueue.pause(),
  ]);
  console.log('⏸️  Queues paused');
}

/**
 * Resume both queues
 */
export async function resumeQueues(): Promise<void> {
  await Promise.all([
    llmQueue.resume(),
    logQueue.resume(),
  ]);
  console.log('▶️  Queues resumed');
}

export default {
  addToLLMQueue,
  addBatchToLLMQueue,
  addToLogQueue,
  logAPIRequest,
  createLogMessage,
  getQueueStats,
  cleanQueues,
  pauseQueues,
  resumeQueues,
};
