#!/bin/bash

IP="72.60.66.164"

echo "🔍 Перевірка IP: $IP"
echo "================================"

echo ""
echo "📡 Ping тест:"
ping -c 3 $IP 2>&1 | head -5

echo ""
echo "🔌 Backend порт 8000:"
timeout 3 bash -c "</dev/tcp/$IP/8000" 2>/dev/null && echo "✅ Доступний" || echo "❌ Недоступний"

echo ""
echo "🔌 Frontend порт 8080:"
timeout 3 bash -c "</dev/tcp/$IP/8080" 2>/dev/null && echo "✅ Доступний" || echo "❌ Недоступний"

echo ""
echo "🌐 Backend HTTP:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" --max-time 5 http://$IP:8000 || echo "❌ Не відповідає"

echo ""
echo "🌐 Frontend HTTP:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" --max-time 5 http://$IP:8080 || echo "❌ Не відповідає"

echo ""
echo "✅ Перевірка завершена!"
