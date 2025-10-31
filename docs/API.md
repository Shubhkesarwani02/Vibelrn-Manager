# 🎨 Quick Reference - LLM & BullMQ Integration

## 📁 Files Created/Modified

### ✨ New Files Created:
```
src/
├── services/
│   ├── geminiService.ts    ⭐ Gemini API client & analysis logic
│   └── queueService.ts     ⭐ BullMQ helper functions
│
├── workers.ts              ⭐ Unified worker runner script
│
.env.example                ⭐ Environment variables template
LLM_INTEGRATION_GUIDE.md    ⭐ Complete documentation
DEVELOPMENT_CHECKLIST.md    ⭐ Testing & verification guide
```

### 🔧 Modified Files:
```
src/
├── jobs/
│   └── llmWorker.ts        ✏️  Refactored to use geminiService
│
├── controllers/
│   └── reviewController.ts ✏️  Updated to use queueService
│
package.json                ✏️  Added worker scripts
```

---

## 🚀 Quick Start Commands

### Development Mode (Hot Reload):
```bash
# Terminal 1: API Server
npm run dev

# Terminal 2: Background Workers
npm run workers:dev
```

### Production Mode:
```bash
# Build first
npm run build

# Terminal 1: API Server
npm start

# Terminal 2: Background Workers
npm run workers:build
```

---

## 🔑 Key Concepts

### 1. **Service Layer Pattern**

**Before:**
```typescript
// Direct queue usage in controller
await llmQueue.add('job', data);
```

**After:**
```typescript
// Clean service layer
import { addBatchToLLMQueue } from './services/queueService';
await addBatchToLLMQueue(data);
```

### 2. **Separation of Concerns**

```
Controller     →  Business logic (what to do)
Service        →  Implementation (how to do it)
Worker         →  Background processing (when to do it)
```

### 3. **Data Flow**

```
API Request
    ↓
Controller (adds job to queue)
    ↓
Returns response immediately ⚡
    ↓
Worker picks up job (in background)
    ↓
Processes with Gemini API
    ↓
Updates database
```

---

## 📦 Service APIs

### GeminiService

```typescript
import geminiService from './services/geminiService';

// Analyze a single review
const result = await geminiService.analyzeToneSentiment(
  "Great product!", 
  9
);
// Returns: { tone: 'positive', sentiment: 'satisfied' }

// Batch analysis
const results = await geminiService.analyzeBatch([
  { text: "Great!", stars: 9 },
  { text: "Bad quality", stars: 2 }
]);
```

### QueueService

```typescript
import { 
  addToLLMQueue,
  addBatchToLLMQueue,
  logAPIRequest,
  getQueueStats 
} from './services/queueService';

// Queue single review
await addToLLMQueue({ id: '1', text: 'Great!', stars: 9 });

// Queue multiple reviews (more efficient)
await addBatchToLLMQueue([
  { id: '1', text: 'Great!', stars: 9 },
  { id: '2', text: 'Poor', stars: 2 }
]);

// Log an API request
await logAPIRequest('GET /reviews/trends');

// Get queue statistics
const stats = await getQueueStats();
console.log(stats);
// Output:
// {
//   llmQueue: { waiting: 5, active: 2, completed: 100, failed: 1 },
//   logQueue: { waiting: 0, active: 1, completed: 50, failed: 0 }
// }
```

---

## 🎯 Common Use Cases

### Use Case 1: Process New Reviews

```typescript
// In controller after creating review
const review = await prisma.reviewHistory.create({ data: {...} });

// Queue for LLM processing
await addToLLMQueue({
  id: review.id.toString(),
  text: review.text,
  stars: review.stars
});
```

### Use Case 2: Batch Process Missing Analyses

```typescript
// Find reviews needing analysis
const reviews = await prisma.reviewHistory.findMany({
  where: {
    OR: [
      { tone: null },
      { sentiment: null }
    ]
  }
});

// Queue all at once
const jobs = reviews.map(r => ({
  id: r.id.toString(),
  text: r.text!,
  stars: r.stars
}));

await addBatchToLLMQueue(jobs);
```

### Use Case 3: Monitor Queue Health

```typescript
// Get current queue status
const stats = await getQueueStats();

if (stats.llmQueue.failed > 10) {
  console.error('Too many failed LLM jobs!');
  // Send alert
}

if (stats.llmQueue.waiting > 100) {
  console.warn('Queue is backing up');
  // Scale workers
}
```

---

## 🔍 Monitoring & Debugging

### Check Worker Status
```bash
# Workers should show:
🚀 Starting BullMQ Workers...
🔄 Log worker started
🤖 LLM worker started
✅ Workers are running and waiting for jobs...
```

### Watch Processing in Real-Time
```bash
# In worker terminal, you'll see:
🤖 Processing review 123...
🤖 Gemini analyzed review: tone=positive, sentiment=satisfied
✅ Analyzed review 123: tone=positive, sentiment=satisfied
```

### Check Queue in Redis
```bash
redis-cli
> KEYS bull:*
> LLEN bull:llmQueue:wait
> LLEN bull:llmQueue:active
```

### Query Database
```sql
-- Recently analyzed reviews
SELECT id, text, tone, sentiment, updated_at
FROM ReviewHistory
WHERE tone IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- Access logs
SELECT * FROM AccessLog
ORDER BY id DESC
LIMIT 10;
```

---

## ⚙️ Configuration

### Environment Variables (.env)
```env
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/vibelrn_db"
GEMINI_API_KEY="your_api_key_here"

# Optional (defaults shown)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
PORT="3000"
```

### Worker Concurrency
```typescript
// In jobs/llmWorker.ts
export const llmWorker = new Worker(
  'llmQueue',
  async (job) => { ... },
  {
    connection,
    concurrency: 5,  // ← Adjust based on load
  }
);
```

### Gemini Service Tuning
```typescript
// In services/geminiService.ts
private async callGeminiAPI(prompt: string) {
  // ...
  generationConfig: {
    temperature: 0.3,     // Lower = more consistent
    topK: 1,
    topP: 1,
    maxOutputTokens: 100, // Adjust for longer responses
  }
}
```

---

## 🐛 Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Workers not starting | Check Redis connection, verify `.env` |
| Jobs not processing | Restart workers, check `getQueueStats()` |
| Gemini API errors | Verify API key, check quota |
| Database timeout | Check connection pool, verify `DATABASE_URL` |
| No tone/sentiment | Check worker logs, verify Gemini API key |

---

## 📊 Architecture Benefits

✅ **Scalability:** Workers can run on separate machines  
✅ **Reliability:** Jobs survive server restarts (stored in Redis)  
✅ **Performance:** API responds instantly, processing happens async  
✅ **Maintainability:** Clean service layer, easy to test  
✅ **Observability:** Centralized logging via logQueue  
✅ **Flexibility:** Easy to add more worker types  

---

## 🎓 Learning Resources

- **BullMQ Docs:** https://docs.bullmq.io/
- **Gemini API Docs:** https://ai.google.dev/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Redis Docs:** https://redis.io/docs/

---

## ✅ Quick Health Check

Run these commands to verify everything works:

```bash
# 1. Check Redis
redis-cli ping
# Expected: PONG

# 2. Test API
curl http://localhost:3000/reviews/trends
# Expected: JSON response with categories

# 3. Queue a test review
curl "http://localhost:3000/reviews?category_id=1"
# Expected: JSON with reviews, some queued for LLM

# 4. Check worker console
# Expected: Processing messages appearing

# 5. Verify database
psql -d vibelrn_db -c "SELECT COUNT(*) FROM AccessLog;"
# Expected: Growing number
```

---

**Status:** ✅ **Implementation Complete & Ready to Use**

**Quick Start:** Run `npm run dev` + `npm run workers:dev` in separate terminals!
