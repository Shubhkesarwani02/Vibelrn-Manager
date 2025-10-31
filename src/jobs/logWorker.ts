import { Worker, type Job } from 'bullmq';
import prisma from '../utils/prismaClient.js';
import dotenv from 'dotenv';

dotenv.config();

// Redis connection for workers
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  maxRetriesPerRequest: null,
};

// Log Worker - processes access log jobs
export const logWorker = new Worker(
  'logQueue',
  async (job: Job) => {
    const { message } = job.data;
    
    try {
      await prisma.accessLog.create({
        data: {
          text: message,
        },
      });
      console.log(`📝 Logged: ${message}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error logging to database:', error);
      throw error;
    }
  },
  { connection }
);

logWorker.on('completed', (job) => {
  console.log(`✅ Log job ${job.id} completed`);
});

logWorker.on('failed', (job, err) => {
  console.error(`❌ Log job ${job?.id} failed:`, err.message);
});

console.log('🔄 Log worker started');
