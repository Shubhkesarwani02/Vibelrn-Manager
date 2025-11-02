import express, { type Request, type Response, type NextFunction } from 'express';
import dotenv from 'dotenv';
import prisma from './utils/prismaClient.js';
import redis from './config/redis.js';
import { logQueue, llmQueue } from './config/bullmq.js';

// Import workers to start them
import './jobs/logWorker.js';
import './jobs/llmWorker.js';

// Import routes
import reviewRoutes from './routes/reviewRoutes.js';

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

// API Routes
app.use('/reviews', reviewRoutes);

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
  console.log('\n🚀 Server running on http://localhost:' + PORT);
  console.log('✅ Database: Connected');
  console.log('✅ Redis: Connected');
  console.log('✅ BullMQ: Active');
  console.log('\n� API Endpoints:');
  console.log('   GET  /health              - Health check');
  console.log('   GET  /reviews/trends      - Top trending categories');
  console.log('   GET  /reviews             - Reviews by category (requires category_id)');
  console.log('   GET  /reviews/pending-llm - Reviews needing LLM processing');
  console.log('\n💡 Press Ctrl+C to stop\n');
});

export default app;
