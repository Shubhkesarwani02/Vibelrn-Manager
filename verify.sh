#!/bin/bash

# 🧪 Quick Verification Script
# Runs basic tests to verify the setup is working

set -e

echo "🧪 Running Quick Verification Tests..."
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Testing $name... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASSED${NC} (HTTP $status)"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC} (Expected $expected_status, got $status)"
        ((FAILED++))
    fi
}

# Wait for server to start
echo "⏳ Waiting for server to start (5 seconds)..."
sleep 5
echo ""

# Test 1: Health Check
test_endpoint "Health Check" "http://localhost:3000/health" 200

# Test 2: Trends Endpoint
test_endpoint "Review Trends" "http://localhost:3000/reviews/trends" 200

# Test 3: Reviews with Category
test_endpoint "Reviews by Category" "http://localhost:3000/reviews?category_id=1" 200

# Test 4: Invalid Category (should return 404)
test_endpoint "Invalid Category" "http://localhost:3000/reviews?category_id=9999" 404

# Test 5: Missing Parameter (should return 400)
test_endpoint "Missing Parameter" "http://localhost:3000/reviews" 400

echo ""
echo "======================================"
echo "Test Results:"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
else
    echo -e "Failed: $FAILED"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Your setup is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the logs.${NC}"
    exit 1
fi
