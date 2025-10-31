# Vibelrn Backend - Review Management System

A Node.js + TypeScript backend for managing product reviews with automatic tone/sentiment analysis using Google Gemini API.

## 🎯 Features

- **Review Management**: Track review history with categories
- **Automatic Analysis**: AI-powered tone & sentiment detection using Gemini
- **Background Jobs**: Async processing with BullMQ + Redis
- **Access Logging**: Automatic API request logging
- **Type-Safe**: Full TypeScript with Prisma ORM

## 🛠️ Tech Stack

- **Node.js** + **Express.js** - Backend framework
- **TypeScript** - Type safety
- **Prisma ORM** - Database modeling
- **PostgreSQL** - Relational database
- **BullMQ + Redis** - Job queue for async tasks
- **Google Gemini API** - LLM for NLP analysis

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 18.x ([Download](https://nodejs.org/))
- **PostgreSQL** ([Download](https://www.postgresql.org/download/))
- **Redis** ([Download](https://redis.io/download))
- **Google Gemini API Key** ([Get one here](https://ai.google.dev/))

---

## 🚀 Quick Start

### 1. Install Redis (macOS)

```bash
brew install redis
brew services start redis
# Or run manually: redis-server
```

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### 2. Setup PostgreSQL Database

Create a new database:
```bash
psql -U postgres
CREATE DATABASE vibelrn_db;
\q
```

### 3. Configure Environment Variables

Update `.env` file with your credentials:

```env
# Database Configuration
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/vibelrn_db"

# Redis Configuration
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# Server Configuration
PORT=5000
NODE_ENV="development"

# Gemini API Configuration
GEMINI_API_KEY="your_actual_gemini_api_key_here"
```

**Important**: Replace:
- `YOUR_USERNAME` and `YOUR_PASSWORD` with your PostgreSQL credentials
- `your_actual_gemini_api_key_here` with your Gemini API key

### 4. Initialize Database

Run Prisma migrations:

```bash
npx prisma migrate dev --name init
```

This will:
- Create the database schema
- Generate Prisma Client
- Set up Category, ReviewHistory, and AccessLog tables

### 5. (Optional) View Database

```bash
npx prisma studio
```

Opens a browser UI at `http://localhost:5555` to view/edit data.

### 6. Start the Server

```bash
npm run dev
```

You should see:
```
🚀 ====================================
   Server running on http://localhost:5000
   ====================================
✅ Database: Connected
✅ Redis: Connected
✅ BullMQ: Active
```

---

## 🧪 Testing the Setup

### Test 1: Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Server is running! 🚀",
  "services": {
    "database": "connected",
    "redis": "connected",
    "bullmq": "active"
  }
}
```

### Test 2: Database Connection
```bash
curl http://localhost:5000/test/db
```

### Test 3: Redis Connection
```bash
curl http://localhost:5000/test/redis
```

### Test 4: BullMQ Queue
```bash
curl http://localhost:5000/test/queue
```

Check logs - you should see:
```
📝 Logged: Test log at 2025-10-31...
✅ Log job 1 completed
```

Then verify in Prisma Studio - check the `AccessLog` table for the entry.

---

## 📁 Project Structure

```
Vibelrn-manager/
│
├── prisma/
│   └── schema.prisma          # Database models
│
├── src/
│   ├── config/
│   │   ├── redis.ts           # Redis connection
│   │   └── bullmq.ts          # BullMQ queue setup
│   │
│   ├── jobs/
│   │   ├── logWorker.ts       # Access log worker
│   │   └── llmWorker.ts       # LLM analysis worker
│   │
│   ├── routes/                # API routes (Day 2)
│   ├── controllers/           # Route handlers (Day 2)
│   ├── services/              # Business logic (Day 2)
│   │
│   ├── utils/
│   │   └── prismaClient.ts    # Prisma singleton
│   │
│   └── index.ts               # Express app entry point
│
├── .env                       # Environment variables
├── package.json
└── tsconfig.json
```

---

## 📝 Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript to JavaScript
npm start        # Run production build
npm run prisma   # Run Prisma CLI commands
```

---

## ✅ Day 1 Checklist

- [x] Initialize Node.js project
- [x] Install dependencies (Express, Prisma, BullMQ, etc.)
- [x] Configure TypeScript
- [x] Create folder structure
- [x] Setup Prisma schema (Category, ReviewHistory, AccessLog)
- [x] Configure Redis connection
- [x] Setup BullMQ queues (logQueue, llmQueue)
- [x] Create BullMQ workers (logWorker, llmWorker)
- [x] Build Express server with health check
- [x] Test all integrations

---

## 🔜 Coming Next (Day 2)

- [ ] Implement `/reviews/trends` API
- [ ] Implement `/reviews?category_id=<id>` API
- [ ] Add pagination logic
- [ ] Integrate LLM analysis for missing tone/sentiment
- [ ] Create seed data
- [ ] End-to-end testing

---

## 🐛 Troubleshooting

### Redis Connection Error
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
brew services start redis
```

### Database Connection Error
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Ensure database exists: `psql -l`

### Prisma Client Not Found
```bash
npx prisma generate
```

### Port Already in Use
Change `PORT` in `.env` or kill existing process:
```bash
lsof -ti:5000 | xargs kill -9
```

---

## 📚 Useful Commands

```bash
# View all queues in Redis
redis-cli
> KEYS *

# Check Prisma migrations
npx prisma migrate status

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Format Prisma schema
npx prisma format

# View generated Prisma Client
npx prisma generate --watch
```

---

## 🎉 Success Criteria

You've successfully completed Day 1 if:

✅ Server starts without errors  
✅ All 4 test endpoints return success  
✅ Redis shows `PONG` on ping  
✅ Prisma Studio shows 3 tables  
✅ Test queue job appears in AccessLog  
✅ No TypeScript errors on build  

---

## 📧 Support

For issues or questions, check:
- [Express.js Docs](https://expressjs.com/)
- [Prisma Docs](https://www.prisma.io/docs)
- [BullMQ Docs](https://docs.bullmq.io/)
- [Gemini API Docs](https://ai.google.dev/)

---

**Good luck with Day 2! 🚀**
