#!/bin/bash

# 🚀 Complete Setup Script for Vibelrn Manager
# This script sets up the entire project from scratch

set -e  # Exit on error

echo "🚀 Starting Vibelrn Manager Setup..."
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Check if .env exists
echo "📋 Step 1: Checking environment configuration..."
if [ -f .env ]; then
    print_success ".env file found"
else
    print_warning ".env file not found"
    if [ -f .env.example ]; then
        echo "📝 Creating .env from .env.example..."
        cp .env.example .env
        print_success ".env file created"
        print_warning "⚠️  IMPORTANT: Edit .env and add your credentials!"
        echo ""
        echo "Required variables:"
        echo "  - DATABASE_URL (PostgreSQL connection string)"
        echo "  - REDIS_HOST, REDIS_PORT (Redis connection)"
        echo "  - GEMINI_API_KEY (Get from https://ai.google.dev/)"
        echo ""
        read -p "Press Enter after you've configured .env..."
    else
        print_error ".env.example not found. Cannot proceed."
        exit 1
    fi
fi
echo ""

# Step 2: Install dependencies
echo "📦 Step 2: Installing dependencies..."
if npm install; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi
echo ""

# Step 3: Check PostgreSQL connection
echo "🗄️  Step 3: Checking PostgreSQL connection..."
if npx prisma db pull --schema=./prisma/schema.prisma 2>/dev/null || npx prisma db push --skip-generate 2>/dev/null; then
    print_success "PostgreSQL connected"
else
    print_error "Cannot connect to PostgreSQL"
    echo "Please ensure PostgreSQL is running and DATABASE_URL is correct in .env"
    exit 1
fi
echo ""

# Step 4: Run database migrations
echo "🔄 Step 4: Running database migrations..."
if npx prisma migrate deploy; then
    print_success "Database migrations completed"
else
    print_error "Failed to run migrations"
    exit 1
fi
echo ""

# Step 5: Generate Prisma Client
echo "🔧 Step 5: Generating Prisma Client..."
if npx prisma generate; then
    print_success "Prisma Client generated"
else
    print_error "Failed to generate Prisma Client"
    exit 1
fi
echo ""

# Step 6: Check Redis connection
echo "🔴 Step 6: Checking Redis connection..."
if redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" ping >/dev/null 2>&1; then
    print_success "Redis connected"
else
    print_warning "Cannot connect to Redis"
    echo "Please ensure Redis is running:"
    echo "  macOS: brew services start redis"
    echo "  Linux: sudo systemctl start redis"
    echo ""
    read -p "Press Enter after starting Redis..."
fi
echo ""

# Step 7: Seed database
echo "🌱 Step 7: Seeding database with test data..."
if npm run seed; then
    print_success "Database seeded with test data"
else
    print_error "Failed to seed database"
    exit 1
fi
echo ""

# Step 8: Build TypeScript
echo "🔨 Step 8: Building TypeScript..."
if npm run build; then
    print_success "TypeScript compiled successfully"
else
    print_error "Failed to build TypeScript"
    exit 1
fi
echo ""

# Final message
echo "========================================"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the API server:"
echo "   ${GREEN}npm run dev${NC}"
echo ""
echo "2. In a new terminal, start the workers:"
echo "   ${GREEN}npm run workers:dev${NC}"
echo ""
echo "3. Test the API:"
echo "   ${GREEN}curl http://localhost:3000/health${NC}"
echo ""
echo "4. View documentation:"
echo "   - README.md - Overview and quick start"
echo "   - TESTING_GUIDE.md - Complete testing instructions"
echo "   - DEPLOYMENT_GUIDE.md - Production deployment"
echo "   - QUICK_REFERENCE.md - API reference"
echo ""
echo "For detailed testing: see TESTING_GUIDE.md"
echo ""
print_success "Happy coding! 🚀"
