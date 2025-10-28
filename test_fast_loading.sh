#!/bin/bash

# Test script for fast loading optimization
# Usage: ./test_fast_loading.sh

echo "========================================="
echo "⚡ Testing Fast Loading Optimization"
echo "========================================="
echo ""

# Configuration
USERNAME="demarketing_ads_testing"
PASSWORD="Sasha2019!"
BASE_URL="http://localhost:8000"
AUTH_HEADER="Authorization: Basic $(echo -n "$USERNAME:$PASSWORD" | base64)"

echo "1️⃣  Testing standard pagination (OLD way)..."
echo "   Making 3 requests with limit=100..."
echo ""

start_time=$(date +%s%3N)

for offset in 0 100 200; do
  response=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/reseller/programs?offset=$offset&limit=100&program_status=ALL")
  count=$(echo "$response" | jq -r '.programs | length' 2>/dev/null || echo "0")
  echo "   ✓ offset=$offset: $count programs"
done

end_time=$(date +%s%3N)
pagination_time=$((end_time - start_time))

echo ""
echo "   ⏱️  Time for 3 paginated requests: ${pagination_time}ms"
echo ""

echo "========================================="
echo ""

echo "2️⃣  Testing fast loading (NEW way)..."
echo "   Making 1 request with all=true..."
echo ""

start_time=$(date +%s%3N)

response=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/reseller/programs?all=true&program_status=ALL")

end_time=$(date +%s%3N)
fast_time=$((end_time - start_time))

# Parse response
total_count=$(echo "$response" | jq -r '.total_count' 2>/dev/null || echo "0")
programs_count=$(echo "$response" | jq -r '.programs | length' 2>/dev/null || echo "0")
loaded_all=$(echo "$response" | jq -r '.loaded_all' 2>/dev/null || echo "false")
response_size=$(echo "$response" | wc -c)

echo "   ✓ Loaded: $programs_count programs"
echo "   ✓ Total in DB: $total_count"
echo "   ✓ loaded_all flag: $loaded_all"
echo "   ✓ Response size: $response_size bytes (~$(($response_size / 1024))KB)"
echo ""
echo "   ⏱️  Time for fast load: ${fast_time}ms"
echo ""

echo "========================================="
echo ""

# Calculate improvement
if [ "$pagination_time" -gt 0 ]; then
  improvement=$(echo "scale=1; $pagination_time / $fast_time" | bc)
  echo "📊 Results:"
  echo "   • Pagination (3 requests): ${pagination_time}ms"
  echo "   • Fast load (1 request): ${fast_time}ms"
  echo "   • Speedup: ${improvement}x faster"
  echo ""
  
  if [ "$loaded_all" = "true" ]; then
    echo "✅ SUCCESS! Fast loading is working!"
  else
    echo "⚠️  WARNING: loaded_all flag is not true"
  fi
else
  echo "⚠️  Could not calculate improvement"
fi

echo ""
echo "========================================="
echo ""

# Extrapolate to full dataset
if [ "$total_count" -gt 0 ]; then
  requests_needed=$((($total_count + 99) / 100))
  estimated_old_time=$(($pagination_time / 3 * $requests_needed))
  estimated_new_time=$fast_time
  
  echo "📈 Extrapolation for ALL $total_count programs:"
  echo "   • OLD way: ~$requests_needed requests × ${pagination_time}ms = ~${estimated_old_time}ms"
  echo "   • NEW way: 1 request = ${estimated_new_time}ms"
  echo "   • Estimated speedup: $(echo "scale=1; $estimated_old_time / $estimated_new_time" | bc)x"
  echo ""
fi

echo "========================================="
echo ""

# Check backend logs for FAST MODE message
echo "🔍 Checking backend logs..."
docker compose logs backend --tail 50 | grep -E "(FAST MODE|Loading ALL)" | tail -1
echo ""

echo "✅ Test complete!"

