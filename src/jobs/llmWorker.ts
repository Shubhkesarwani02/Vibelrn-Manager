import { Worker, type Job } from 'bullmq';
import prisma from '../utils/prismaClient.js';
import geminiService from '../services/geminiService.js';
import { addToLogQueue } from '../services/queueService.js';
import dotenv from 'dotenv';

dotenv.config();

// Redis connection for workers
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  maxRetriesPerRequest: null,
};

// LLM Worker - processes tone/sentiment analysis jobs
export const llmWorker = new Worker(
  'llmQueue',
  async (job: Job) => {
    const { id, text, stars } = job.data;

    try {
      console.log(`🤖 Processing review ${id}...`);

      // Get tone and sentiment from Gemini service
      const { tone, sentiment } = await geminiService.analyzeToneSentiment(text, stars);

      // Update the review in database
      await prisma.reviewHistory.update({
        where: { id: BigInt(id) },
        data: {
          tone,
          sentiment,
        },
      });

      // Log the successful processing
      await addToLogQueue({
        message: `LLM_PROCESSED - review_id: ${id}, tone: ${tone}, sentiment: ${sentiment} - ${new Date().toISOString()}`,
      });

      console.log(`✅ Analyzed review ${id}: tone=${tone}, sentiment=${sentiment}`);
      return { success: true, tone, sentiment };
    } catch (error) {
      console.error(`❌ Error analyzing review ${id}:`, error);
      
      // Log the failure
      await addToLogQueue({
        message: `LLM_FAILED - review_id: ${id}, error: ${error instanceof Error ? error.message : 'Unknown error'} - ${new Date().toISOString()}`,
      });
      
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 LLM requests concurrently
  }
);

llmWorker.on('completed', (job) => {
  console.log(`✅ LLM job ${job.id} completed`);
});

llmWorker.on('failed', (job, err) => {
  console.error(`❌ LLM job ${job?.id} failed:`, err.message);
});

console.log('🤖 LLM worker started');
