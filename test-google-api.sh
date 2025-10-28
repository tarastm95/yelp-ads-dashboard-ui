#!/bin/bash

API_KEY="AIzaSyD6iwC3HACQWKrcAMuqC57FpjX6cEMykeU"
TEST_INPUT="New York"

echo "🧪 Тестування Google Places API..."
echo "🔑 API Key: ${API_KEY:0:20}..."
echo ""

for i in {1..10}; do
    echo "[$i/10] Спробуємо через 10 секунд..."
    sleep 10
    
    RESULT=$(curl -s "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${TEST_INPUT}&key=${API_KEY}&components=country:us" 2>&1)
    
    STATUS=$(echo "$RESULT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('status'))" 2>/dev/null)
    ERROR=$(echo "$RESULT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('error_message','None'))" 2>/dev/null)
    COUNT=$(echo "$RESULT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('predictions',[])))" 2>/dev/null)
    
    echo "Статус: $STATUS | Результатів: $COUNT | Помилка: ${ERROR:0:50}"
    
    if [ "$STATUS" = "OK" ]; then
        echo ""
        echo "✅ ✅ ✅ УСПІХ! API працює! ✅ ✅ ✅"
        echo ""
        PREDICTION=$(echo "$RESULT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('predictions',[{}])[0].get('description',''))" 2>/dev/null)
        echo "Приклад результату: $PREDICTION"
        exit 0
    fi
    
    echo ""
done

echo ""
echo "❌ API все ще не працює після 10 спроб"
echo "Перевірте налаштування в Google Cloud Console"

