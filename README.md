# Vibelrn Manager

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.1-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-Latest-red.svg)](https://redis.io/)
[![Prisma](https://img.shields.io/badge/Prisma-6.18-2D3748.svg)](https://www.prisma.io/)

A scalable, production-ready review management system with intelligent sentiment analysis powered by Google's Gemini AI. Built with modern TypeScript, featuring asynchronous job processing, comprehensive API endpoints, and robust data persistence.

## 🚀 Features

- **Intelligent Review Analysis**: Automated tone and sentiment analysis using Google Gemini AI
- **Asynchronous Processing**: Background job queue system using BullMQ and Redis
- **Version Control**: Complete review history tracking with temporal data
- **RESTful API**: Clean, well-documented REST endpoints
- **Type Safety**: Full TypeScript implementation with strict typing
- **Scalable Architecture**: Separation of concerns with modular service layer
- **Database Management**: PostgreSQL with Prisma ORM for type-safe database access
- **Production Ready**: Health checks, error handling, and comprehensive logging

## 📋 Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## 🏗️ Architecture

The system follows a multi-tier architecture with clear separation of concerns:

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       v
┌─────────────────────┐
│   Express API       │
│   Controllers       │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│   Service Layer     │
│   • Review Service  │
│   • Queue Service   │
│   • Gemini Service  │
└──────┬──────────────┘
       │
       v
┌──────────────┬──────────────┐
│  PostgreSQL  │    Redis     │
│   (Prisma)   │   (BullMQ)   │
└──────────────┴──────┬───────┘
                      │
                      v
               ┌──────────────┐
               │   Workers    │
               │   • LLM      │
               │   • Logging  │
               └──────────────┘
```

### Key Components

- **API Server**: Express.js REST API handling client requests
- **Background Workers**: Asynchronous job processors for AI analysis and logging
- **Database Layer**: PostgreSQL with Prisma ORM for type-safe data access
- **Queue System**: Redis-backed BullMQ for reliable job processing
- **AI Integration**: Google Gemini API for sentiment and tone analysis

For detailed architecture diagrams, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 🔧 Prerequisites

- **Node.js** >= 20.x
- **npm** >= 9.x
- **PostgreSQL** >= 14.x
- **Redis** >= 7.x
- **Google Gemini API Key** (for AI features)

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Shubhkesarwani02/Vibelrn-Manager.git
cd Vibelrn-Manager
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Configure the following environment variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/vibelrn_db"

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Database Setup

```bash
# Run database migrations
npm run db:migrate

# Seed the database with initial data (optional)
npm run seed
```

### 5. Automated Setup

Alternatively, use the automated setup script:

```bash
npm run setup
```

## ⚙️ Configuration

### Database Configuration

The database schema is managed using Prisma. Key models include:

- **Category**: Review categories
- **ReviewHistory**: Review versions with sentiment analysis
- **AccessLog**: API request logging

To modify the schema, edit `prisma/schema.prisma` and run:

```bash
npm run db:migrate
```

### Redis Configuration

Configure Redis connection in `src/config/redis.ts`. The default configuration connects to `localhost:6379`.

### Worker Concurrency

Adjust worker concurrency in `src/jobs/llmWorker.ts` and `src/jobs/logWorker.ts`:

```typescript
// Example: Process 5 jobs concurrently
const worker = new Worker('llmQueue', processor, {
  connection: redis,
  concurrency: 5,
});
```

## 🚀 Usage

### Development Mode (with hot reload)

```bash
# Terminal 1: Start the API server
npm run dev

# Terminal 2: Start the background workers
npm run workers:dev
```

### Production Mode

```bash
# Build the project
npm run build

# Terminal 1: Start the API server
npm start

# Terminal 2: Start the background workers
npm run workers:build
```

### Database Management

```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (⚠️ deletes all data)
npm run db:reset

# Deploy migrations (production)
npm run db:deploy
```

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Server is running! 🚀",
  "timestamp": "2025-11-01T12:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "bullmq": "active"
  }
}
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Endpoints

#### Health Check
```http
GET /health
```
Returns server health status and service connectivity.

#### Create Review
```http
POST /reviews
Content-Type: application/json

{
  "text": "This product exceeded my expectations!",
  "stars": 9,
  "category_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "text": "This product exceeded my expectations!",
    "stars": 9,
    "category_id": 1,
    "review_id": "rev_abc123",
    "created_at": "2025-11-01T12:00:00.000Z"
  },
  "message": "Review created successfully"
}
```

#### Get All Reviews
```http
GET /reviews?page=1&limit=10&category_id=1&sortBy=created_at&sortOrder=desc
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `category_id` (optional): Filter by category
- `sortBy` (optional): Sort field (default: created_at)
- `sortOrder` (optional): asc or desc (default: desc)

#### Get Review by ID
```http
GET /reviews/:id
```

#### Update Review
```http
PUT /reviews/:id
Content-Type: application/json

{
  "text": "Updated review text",
  "stars": 8,
  "category_id": 1
}
```

#### Delete Review
```http
DELETE /reviews/:id
```

#### Get Review History
```http
GET /reviews/:review_id/history
```
Returns all versions of a review.

For complete API documentation, see [API.md](docs/API.md).

## 🛠️ Development

### Project Scripts

```bash
# Development
npm run dev              # Start API server with hot reload
npm run workers:dev      # Start workers with hot reload

# Building
npm run build            # Compile TypeScript to JavaScript

# Production
npm start                # Run compiled API server
npm run workers:build    # Run compiled workers

# Database
npm run db:migrate       # Run migrations
npm run db:deploy        # Deploy migrations (production)
npm run db:studio        # Open Prisma Studio
npm run db:reset         # Reset database
npm run seed             # Seed database

# Testing & Verification
npm run verify           # Run verification tests
npm test                 # Alias for verify

# Maintenance
npm run clean            # Remove dist and node_modules
npm run reinstall        # Clean and reinstall dependencies
```

### Testing

Run the verification script to test all endpoints:

```bash
npm run verify
```

This script tests:
- ✅ Server health
- ✅ Database connectivity
- ✅ Redis connectivity
- ✅ CRUD operations
- ✅ Pagination
- ✅ Review history
- ✅ Background job processing

### Code Structure

```typescript
// Example service layer pattern
import { addBatchToLLMQueue } from '../services/queueService.js';
import { createReview } from '../services/reviewService.js';

export const createReviewController = async (req, res) => {
  const review = await createReview(req.body);
  await addBatchToLLMQueue([review]);
  res.json({ success: true, data: review });
};
```

## 🚢 Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Quick Deployment Checklist

1. **Environment Variables**: Set all production environment variables
2. **Database**: Run `npm run db:deploy` for production migrations
3. **Build**: Compile TypeScript with `npm run build`
4. **Process Management**: Use PM2 or similar for process management
5. **Reverse Proxy**: Configure nginx or similar for SSL termination
6. **Monitoring**: Set up logging and monitoring solutions
7. **Scaling**: Run multiple worker instances for high throughput

### Docker Deployment (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 📁 Project Structure

```
vibelrn-manager/
├── src/
│   ├── config/           # Configuration files
│   │   ├── bullmq.ts     # BullMQ queue configuration
│   │   └── redis.ts      # Redis client configuration
│   ├── controllers/      # Request handlers
│   │   └── reviewController.ts
│   ├── jobs/             # Background job processors
│   │   ├── llmWorker.ts  # AI analysis worker
│   │   └── logWorker.ts  # Logging worker
│   ├── routes/           # API route definitions
│   │   └── reviewRoutes.ts
│   ├── services/         # Business logic layer
│   │   ├── geminiService.ts    # Gemini AI integration
│   │   ├── queueService.ts     # Queue management
│   │   └── reviewService.ts    # Review operations
│   ├── utils/            # Utility functions
│   │   ├── pagination.ts
│   │   └── prismaClient.ts
│   ├── index.ts          # API server entry point
│   └── workers.ts        # Worker processes entry point
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── seed.ts           # Database seeding
│   └── migrations/       # Migration history
├── docs/
│   ├── API.md            # API documentation
│   ├── ARCHITECTURE.md   # System architecture
│   └── DEPLOYMENT.md     # Deployment guide
├── package.json
├── tsconfig.json
├── setup.sh              # Automated setup script
├── verify.sh             # Verification script
└── README.md
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Maintain consistent code style

## 📄 License

This project is licensed under the ISC License.

## 👤 Author

**Shubh Kesarwani**
- GitHub: [@Shubhkesarwani02](https://github.com/Shubhkesarwani02)

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Fast, unopinionated web framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [BullMQ](https://docs.bullmq.io/) - Premium queue package for Node.js
- [Google Gemini](https://ai.google.dev/) - AI model for sentiment analysis
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript at scale

## 📞 Support

For support, please open an issue in the [GitHub repository](https://github.com/Shubhkesarwani02/Vibelrn-Manager/issues).

---

**Built with ❤️ using TypeScript, Express, and modern web technologies**
