# 🎨 System Architecture Diagrams

## 1. High-Level System Overview

```
┌───────────────────────────────────────────────────────────────┐
│                         CLIENT                                 │
│                    (Browser / Postman)                         │
└───────────────────────┬───────────────────────────────────────┘
                        │ HTTP Requests
                        ▼
┌───────────────────────────────────────────────────────────────┐
│                   EXPRESS API SERVER                           │
│                    (Port 3000)                                 │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Controllers                              │    │
│  │         (reviewController.ts)                         │    │
│  └─────────────────┬────────────────────────────────────┘    │
│                    │                                           │
│  ┌─────────────────┴────────────────────────────────────┐    │
│  │              Services Layer                           │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │    │
│  │  │ queueService │ │geminiService │ │reviewService │ │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ │    │
│  └──────────────────────────────────────────────────────┘    │
│                    │                                           │
└────────────────────┼───────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│   PostgreSQL    │    │      Redis       │
│   (Database)    │    │   (Job Queue)    │
└─────────────────┘    └────────┬─────────┘
                                │
                                ▼
                 ┌──────────────────────────────┐
                 │    BACKGROUND WORKERS        │
                 │      (workers.ts)            │
                 │                              │
                 │  ┌────────────────────────┐ │
                 │  │   LLM Worker           │ │
                 │  │   • Process llmQueue   │ │
                 │  │   • Call Gemini API    │ │
                 │  │   • Update DB          │ │
                 │  │   • Concurrency: 5     │ │
                 │  └────────────────────────┘ │
                 │                              │
                 │  ┌────────────────────────┐ │
                 │  │   Log Worker           │ │
                 │  │   • Process logQueue   │ │
                 │  │   • Insert AccessLog   │ │
                 │  └────────────────────────┘ │
                 └──────────────────────────────┘
```

---

## 2. Request Flow - GET /reviews?category_id=1

```
1. Client Request
   │
   ▼
2. reviewController.getReviews()
   │
   ├─► logAPIRequest()
   │   └─► addToLogQueue({ message: "GET /reviews..." })
   │       └─► logQueue (Redis)
   │
   ├─► reviewService.getReviewsByCategory()
   │   └─► Prisma query to database
   │       └─► Returns reviews
   │
   ├─► Filter reviews missing tone/sentiment
   │
   ├─► addBatchToLLMQueue([...reviews])
   │   └─► llmQueue (Redis)
   │
   └─► Return response to client ⚡ (instant)

─────────────────────────────────────────────────────────

Background Processing (async, ~1-2 seconds later):

3. Log Worker picks job from logQueue
   └─► Insert to AccessLog table
       └─► ✅ Complete

4. LLM Worker picks job from llmQueue
   └─► geminiService.analyzeToneSentiment()
       └─► Call Gemini API
           └─► Parse response
               └─► Update ReviewHistory table
                   └─► addToLogQueue({ message: "LLM_PROCESSED..." })
                       └─► ✅ Complete
```

---

## 3. Service Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  CONTROLLER LAYER                        │
│            (reviewController.ts)                         │
│  • HTTP request handling                                 │
│  • Input validation                                      │
│  • Response formatting                                   │
└───────────────────┬─────────────────────────────────────┘
                    │ calls
                    ▼
┌─────────────────────────────────────────────────────────┐
│                  SERVICE LAYER                           │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  queueService.ts                               │    │
│  │  • addToLLMQueue()                             │    │
│  │  • addBatchToLLMQueue()                        │    │
│  │  • logAPIRequest()                             │    │
│  │  • getQueueStats()                             │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  geminiService.ts                              │    │
│  │  • analyzeToneSentiment()                      │    │
│  │  • analyzeBatch()                              │    │
│  │  • buildPrompt()                               │    │
│  │  • parseResponse()                             │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  reviewService.ts                              │    │
│  │  • getTrendingCategories()                     │    │
│  │  • getReviewsByCategory()                      │    │
│  │  • categoryExists()                            │    │
│  └────────────────────────────────────────────────┘    │
└───────────────────┬─────────────────────────────────────┘
                    │ uses
                    ▼
┌─────────────────────────────────────────────────────────┐
│              INFRASTRUCTURE LAYER                        │
│  • Prisma (Database)                                     │
│  • BullMQ (Job Queue)                                    │
│  • Redis (Queue Storage)                                 │
│  • Gemini API (External Service)                        │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Worker Processing Flow

```
┌─────────────────────────────────────────────────────────┐
│                    REDIS QUEUES                          │
│                                                          │
│  ┌──────────────────┐        ┌──────────────────┐      │
│  │   llmQueue       │        │   logQueue       │      │
│  │                  │        │                  │      │
│  │ Job 1: review 1  │        │ Job 1: API log   │      │
│  │ Job 2: review 2  │        │ Job 2: LLM log   │      │
│  │ Job 3: review 3  │        │ Job 3: Error log │      │
│  │ ...              │        │ ...              │      │
│  └──────────────────┘        └──────────────────┘      │
└─────┬──────────────────────────────┬──────────────────┘
      │                              │
      │ Worker polls                 │ Worker polls
      ▼                              ▼
┌──────────────────────┐    ┌──────────────────────┐
│   LLM WORKER         │    │   LOG WORKER         │
│                      │    │                      │
│ 1. Pick job          │    │ 1. Pick job          │
│    ↓                 │    │    ↓                 │
│ 2. Extract data      │    │ 2. Extract message   │
│    ↓                 │    │    ↓                 │
│ 3. Call Gemini API   │    │ 3. Insert AccessLog  │
│    ↓                 │    │    ↓                 │
│ 4. Parse response    │    │ 4. Mark complete     │
│    ↓                 │    │                      │
│ 5. Update DB         │    └──────────────────────┘
│    ↓                 │
│ 6. Log result        │
│    ↓                 │
│ 7. Mark complete     │
│                      │
│ Concurrency: 5       │
│ Retry: 3 attempts    │
└──────────────────────┘
```

---

## 5. Data Models & Relationships

```
┌─────────────────────────────────────────┐
│           Category                      │
│  ┌───────────────────────────────┐     │
│  │ id         (BigInt, PK)       │     │
│  │ name       (String, UNIQUE)   │     │
│  │ description (String)          │     │
│  └───────────────────────────────┘     │
└───────────────┬─────────────────────────┘
                │ 1:N
                ▼
┌───────────────────────────────────────────────────┐
│           ReviewHistory                            │
│  ┌─────────────────────────────────────────┐     │
│  │ id          (BigInt, PK)                │     │
│  │ text        (String)                    │     │
│  │ stars       (Int, 1-10)                 │     │
│  │ review_id   (String)                    │     │
│  │ tone        (String) ← Updated by LLM   │     │
│  │ sentiment   (String) ← Updated by LLM   │     │
│  │ category_id (BigInt, FK)                │     │
│  │ created_at  (DateTime)                  │     │
│  │ updated_at  (DateTime)                  │     │
│  └─────────────────────────────────────────┘     │
└───────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│           AccessLog                                │
│  ┌─────────────────────────────────────────┐     │
│  │ id          (BigInt, PK)                │     │
│  │ text        (String)                    │     │
│  └─────────────────────────────────────────┘     │
└───────────────────────────────────────────────────┘
```

---

## 6. Job Queue Structure

```
┌──────────────────────────────────────────────────────┐
│                  BullMQ Job                          │
│                                                      │
│  {                                                   │
│    id: "1234",                 // Unique job ID     │
│    name: "process-review",     // Job type          │
│    data: {                     // Job payload       │
│      id: "review_123",                              │
│      text: "Great product!",                        │
│      stars: 9                                       │
│    },                                               │
│    opts: {                     // Job options       │
│      attempts: 3,              // Retry count       │
│      backoff: {                                     │
│        type: 'exponential',                         │
│        delay: 2000             // 2s, 4s, 8s       │
│      },                                             │
│      removeOnComplete: true,   // Auto cleanup      │
│      removeOnFail: false       // Keep for debug    │
│    }                                                │
│  }                                                  │
└──────────────────────────────────────────────────────┘
```

---

## 7. Gemini API Integration Flow

```
┌──────────────────────────────────────────────────────┐
│           geminiService.analyzeToneSentiment()       │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  1. Build Prompt                                     │
│     "Analyze tone and sentiment of:                  │
│      'Great product!' with 9 stars out of 10.        │
│      Respond in JSON: {tone, sentiment}"             │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  2. Call Gemini API                                  │
│     POST /v1beta/models/gemini-pro:generateContent   │
│     Headers: { Content-Type: application/json }      │
│     Body: { contents: [{ parts: [{ text }] }] }      │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  3. Parse Response                                   │
│     Extract: candidates[0].content.parts[0].text     │
│     Parse JSON from response text                    │
│     Validate tone & sentiment values                 │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  4. Return Result or Fallback                        │
│     Success: { tone: 'positive', sentiment: 'happy' }│
│     Fallback: Use star-based heuristic               │
└──────────────────────────────────────────────────────┘
```

---

## 8. Error Handling & Retry Logic

```
┌──────────────────────────────────────────────────────┐
│              Job Processing                          │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Attempt 1                                           │
│  ├─ Try process                                      │
│  ├─ Error? ─────► Wait 2 seconds                     │
│  │                     │                             │
│  └─ Success ──────►  ✅ Complete                     │
│                       │                              │
│                       ▼                              │
│  Attempt 2                                           │
│  ├─ Try process                                      │
│  ├─ Error? ─────► Wait 4 seconds                     │
│  │                     │                             │
│  └─ Success ──────►  ✅ Complete                     │
│                       │                              │
│                       ▼                              │
│  Attempt 3 (Final)                                   │
│  ├─ Try process                                      │
│  ├─ Error? ─────► ❌ Move to Failed Queue            │
│  │                     │                             │
│  │                     ├─► Log error to database     │
│  │                     └─► Alert admins              │
│  │                                                   │
│  └─ Success ──────►  ✅ Complete                     │
└──────────────────────────────────────────────────────┘
```

---

## 9. Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION SETUP                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  API Server     │     │  Worker Server  │     │  Worker Server  │
│  Instance 1     │     │  Instance 1     │     │  Instance 2     │
│                 │     │                 │     │                 │
│  npm start      │     │  npm run        │     │  npm run        │
│                 │     │  workers:build  │     │  workers:build  │
│  Port: 3000     │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         │                                               │
         ▼                                               ▼
┌─────────────────┐                           ┌─────────────────┐
│  Redis Cloud    │                           │   PostgreSQL    │
│  (Queue Store)  │                           │   (Database)    │
│                 │                           │                 │
│  • llmQueue     │                           │  • Category     │
│  • logQueue     │                           │  • ReviewHistory│
│                 │                           │  • AccessLog    │
└─────────────────┘                           └─────────────────┘

External Services:
┌─────────────────┐
│  Gemini API     │
│  (Google AI)    │
└─────────────────┘
```

---

## 10. Monitoring & Observability

```
┌─────────────────────────────────────────────────────────┐
│                   MONITORING STACK                       │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Application Logs                              │    │
│  │  • API requests                                │    │
│  │  • Worker processing                           │    │
│  │  • Errors & exceptions                         │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Queue Metrics (via getQueueStats())           │    │
│  │  • Jobs waiting                                │    │
│  │  • Jobs active                                 │    │
│  │  • Jobs completed                              │    │
│  │  • Jobs failed                                 │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Database Queries                              │    │
│  │  • Reviews needing analysis                    │    │
│  │  • Recent completions                          │    │
│  │  • Access log count                            │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Optional: Bull Board                          │    │
│  │  • Visual queue dashboard                      │    │
│  │  • Job details & history                       │    │
│  │  • Manual job management                       │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 11. File Dependencies Graph

```
index.ts (API Server)
 │
 ├─► routes/reviewRoutes.ts
 │    └─► controllers/reviewController.ts
 │         │
 │         ├─► services/queueService.ts
 │         │    └─► config/bullmq.ts
 │         │         └─► config/redis.ts
 │         │
 │         └─► services/reviewService.ts
 │              └─► utils/prismaClient.ts
 │
 └─► config/bullmq.ts

workers.ts (Background Processing)
 │
 ├─► jobs/llmWorker.ts
 │    │
 │    ├─► services/geminiService.ts
 │    ├─► services/queueService.ts
 │    └─► utils/prismaClient.ts
 │
 └─► jobs/logWorker.ts
      └─► utils/prismaClient.ts
```

---

These diagrams provide a comprehensive visual understanding of the system architecture, data flow, and component relationships. Refer to them when:

- 🎯 Onboarding new developers
- 🐛 Debugging issues
- 📈 Planning scaling strategies
- 🔧 Making architectural decisions

