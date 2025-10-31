import express, { type Request, type Response, type NextFunction } from 'express';
import dotenv from 'dotenv';
import prisma from './utils/prismaClient.js';
import redis from './config/redis.js';
import { logQueue, llmQueue } from './config/bullmq.js';

// Import workers to start them
import './jobs/logWorker.js';
import './jobs/llmWorker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Server is running! 🚀',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: 'connected',
      bullmq: 'active',
    },
  });
});

// Test database connection
app.get('/test/db', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ message: '✅ Database connection successful' });
  } catch (error) {
    res.status(500).json({
      message: '❌ Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Test Redis connection
app.get('/test/redis', async (req: Request, res: Response) => {
  try {
    await redis.ping();
    res.json({ message: '✅ Redis connection successful' });
  } catch (error) {
    res.status(500).json({
      message: '❌ Redis connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Test BullMQ job queue
app.get('/test/queue', async (req: Request, res: Response) => {
  try {
    const job = await logQueue.add('test-log', {
      message: `Test log at ${new Date().toISOString()}`,
    });
    res.json({
      message: '✅ BullMQ job added successfully',
      jobId: job.id,
    });
  } catch (error) {
    res.status(500).json({
      message: '❌ BullMQ job failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.url,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n📪 Shutting down gracefully...');
  await prisma.$disconnect();
  await redis.quit();
  await logQueue.close();
  await llmQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n📪 Shutting down gracefully...');
  await prisma.$disconnect();
  await redis.quit();
  await logQueue.close();
  await llmQueue.close();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 ====================================');
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log('   ====================================');
  console.log('✅ Database: Connected');
  console.log('✅ Redis: Connected');
  console.log('✅ BullMQ: Active');
  console.log('\n📋 Available routes:');
  console.log(`   GET  /health       - Health check`);
  console.log(`   GET  /test/db      - Test database connection`);
  console.log(`   GET  /test/redis   - Test Redis connection`);
  console.log(`   GET  /test/queue   - Test BullMQ queue`);
  console.log('\n💡 Press Ctrl+C to stop\n');
});

export default app;
