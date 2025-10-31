/**
 * Workers Entry Point
 * Starts both LLM and Log workers
 * Run this file to process background jobs
 */

import { llmWorker } from './jobs/llmWorker.js';
import { logWorker } from './jobs/logWorker.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Starting BullMQ Workers...');
console.log('=====================================');

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close workers
    await Promise.all([
      llmWorker.close(),
      logWorker.close(),
    ]);
    
    console.log('✅ All workers closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

console.log('✅ Workers are running and waiting for jobs...');
console.log('📋 LLM Worker: Processing tone/sentiment analysis');
console.log('📝 Log Worker: Processing access logs');
console.log('=====================================');
console.log('Press Ctrl+C to stop workers');
