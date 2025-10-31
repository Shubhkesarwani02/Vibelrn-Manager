import { Queue, type QueueOptions } from 'bullmq';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis connection for BullMQ
const connection: QueueOptions['connection'] = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  maxRetriesPerRequest: null,
};

// Log Queue - for logging API access
export const logQueue = new Queue('logQueue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// LLM Queue - for processing tone/sentiment analysis
export const llmQueue = new Queue('llmQueue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

console.log('✅ BullMQ queues initialized');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await logQueue.close();
  await llmQueue.close();
  console.log('📪 BullMQ queues closed');
});
