#!/bin/bash

API_KEY="AIzaSyCjLqOEOTloPy-rc64jyoZDeKxW6RQ1AFs"

echo "🧪 Тестування Google Places API (New) - Autocomplete"
echo "🔑 API Key: ${API_KEY:0:20}..."
echo ""

echo "Test 1: New York"
curl -s -X POST "https://places.googleapis.com/v1/places:autocomplete" \
  -H "Content-Type: application/json" \
  -H "X-Goog-Api-Key: $API_KEY" \
  -d '{"input":"New York","includedRegionCodes":["US"]}' | \
  python3 -c "import sys, json; d=json.load(sys.stdin); print('✅ Знайдено:', len(d.get('suggestions',[])), 'результатів')"
echo ""

echo "Test 2: ZIP Code 90210"
curl -s -X POST "https://places.googleapis.com/v1/places:autocomplete" \
  -H "Content-Type: application/json" \
  -H "X-Goog-Api-Key: $API_KEY" \
  -d '{"input":"90210","includedRegionCodes":["US"]}' | \
  python3 -c "import sys, json; d=json.load(sys.stdin); print('✅ Знайдено:', len(d.get('suggestions',[])), 'результатів')"
echo ""

echo "Test 3: Los Angeles"
curl -s -X POST "https://places.googleapis.com/v1/places:autocomplete" \
  -H "Content-Type: application/json" \
  -H "X-Goog-Api-Key: $API_KEY" \
  -d '{"input":"Los Angeles","includedRegionCodes":["US"]}' | \
  python3 -c "import sys, json; d=json.load(sys.stdin); print('✅ Знайдено:', len(d.get('suggestions',[])), 'результатів')"
echo ""

echo "✅ Тестування завершено!"

