# ⚡ Batch Size Optimization: 20 → 40

## Зміна

Збільшено `batch_size` з **20 до 40** для зменшення кількості HTTP запитів до Yelp Partner API.

## Математика

### До оптимізації (batch_size=20):
```
1914 програм / 20 per request = 96 запитів
Всі 96 запитів йдуть ПАРАЛЕЛЬНО (asyncio)
Час: ~6.3 секунди
```

### Після оптимізації (batch_size=40):
```
1914 програм / 40 per request = 48 запитів
Всі 48 запитів йдуть ПАРАЛЕЛЬНО (asyncio)
Очікуваний час: ~3-4 секунди ⚡
```

## Чому це швидше?

### HTTP Overhead
Кожен HTTP запит має фіксований overhead:
- TCP handshake: ~20ms
- TLS negotiation: ~20ms
- HTTP headers: ~5ms
- Network latency: ~10-50ms
- **Total overhead: ~55-95ms per request**

### Порівняння:

**Batch size 20:**
```
Request 1: 70ms overhead + 10ms data = 80ms for 20 programs
Request 2: 70ms overhead + 10ms data = 80ms for 20 programs
...
Request 96: 70ms overhead + 10ms data = 80ms for 20 programs

Total overhead: 96 requests × 70ms = 6.7 seconds
```

**Batch size 40:**
```
Request 1: 70ms overhead + 15ms data = 85ms for 40 programs
Request 2: 70ms overhead + 15ms data = 85ms for 40 programs
...
Request 48: 70ms overhead + 15ms data = 85ms for 40 programs

Total overhead: 48 requests × 70ms = 3.4 seconds ⚡
```

**Економія: ~3 секунди (50% швидше!)**

## Змінені файли

### 1. `backend/ads/async_sync_service.py`
```python
# До:
async def fetch_all_programs_async(..., batch_size: int = 20, ...):
def sync_with_asyncio(cls, username: str, batch_size: int = 20):

# Після:
async def fetch_all_programs_async(..., batch_size: int = 40, ...):
def sync_with_asyncio(cls, username: str, batch_size: int = 40):
```

### 2. `backend/ads/views.py`
```python
# До:
result = ProgramSyncService.sync_programs(username, batch_size=20)
batch_size = int(request.data.get('batch_size', 20)) ...

# Після:
result = ProgramSyncService.sync_programs(username, batch_size=40)
batch_size = int(request.data.get('batch_size', 40)) ...
```

### 3. `backend/ads/sync_service.py`
```python
# До:
def sync_with_streaming(cls, username: str, batch_size: int = 20):

# Після:
def sync_with_streaming(cls, username: str, batch_size: int = 40):
```

### 4. `backend/ads/redis_service.py`
```python
# До:
def fetch_all_programs_batch(self, fetch_function, batch_size: int = 20, ...):

# Після:
def fetch_all_programs_batch(self, fetch_function, batch_size: int = 40, ...):
```

## Паралельність залишається максимальною

**ВАЖЛИВО:** Це НЕ впливає на паралельність!

- ✅ **До**: 96 запитів йдуть ОДНОЧАСНО (unlimited concurrency via asyncio)
- ✅ **Після**: 48 запитів йдуть ОДНОЧАСНО (unlimited concurrency via asyncio)

Різниця лише в:
- **Кількості запитів**: 96 → 48
- **Розмірі кожного запиту**: 20 programs → 40 programs

## Безпека

### Чи є ризик rate limiting?

**Ні**, тому що:

1. **Кількість одночасних запитів зменшилась** (96 → 48)
2. **Час обробки одного запиту зріс незначно** (80ms → 85ms)
3. **Загальне навантаження на API залишається подібним**

### Порівняння навантаження:

```
Batch 20: 96 requests × 80ms = peak load of 96 concurrent connections
Batch 40: 48 requests × 85ms = peak load of 48 concurrent connections

✅ МЕНШЕ навантаження на API!
```

### Чи підтримує Yelp API limit=40?

**Так!** Yelp Partner API підтримує `limit` до 100:
```
GET /programs/v1?offset=0&limit=40  ✅ OK
GET /programs/v1?offset=0&limit=100 ✅ OK (max)
```

## Тестування

### Команди для моніторингу:

```bash
# 1. Моніторинг timing логів
docker compose logs -f backend | grep -E "TIMING.*Yelp API"

# 2. Перевірка кількості батчів
docker compose logs -f backend | grep -E "Number of pages"

# 3. Перевірка швидкості
docker compose logs -f backend | grep -E "programs/second"
```

### Очікувані результати:

**До (batch_size=20):**
```
📄 [ASYNC] Batch size: 20
🔢 [ASYNC] Number of pages: 96
⏱️  [TIMING] Yelp API fetch: 6.3s
🚀 [ASYNC] Speed: 302 programs/second
```

**Після (batch_size=40):**
```
📄 [ASYNC] Batch size: 40
🔢 [ASYNC] Number of pages: 48
⏱️  [TIMING] Yelp API fetch: 3-4s ⚡
🚀 [ASYNC] Speed: ~500 programs/second
```

## Очікувані переваги

### 1. Швидкість синхронізації:
```
До:  9.1s total (6.3s API + 2.8s other)
Після: 6-7s total (3-4s API + 2.8s other) ⚡
Прискорення: ~30%
```

### 2. Менше мережевого трафіку:
```
До:  96 requests × 500 bytes headers = 48 KB overhead
Після: 48 requests × 500 bytes headers = 24 KB overhead
Економія: 24 KB (50%)
```

### 3. Менше навантаження на Yelp API:
```
До:  96 concurrent connections
Після: 48 concurrent connections
Зменшення навантаження: 50%
```

## Rollback (якщо потрібно)

Якщо виникнуть проблеми, можна швидко повернутись назад:

```python
# У всіх файлах замінити:
batch_size: int = 40  →  batch_size: int = 20
batch_size=40         →  batch_size=20
```

І перезапустити backend:
```bash
docker compose restart backend
```

## Подальша оптимізація

Якщо `batch_size=40` працює добре, можна експериментувати з:

- **batch_size=50**: 1914 / 50 = 39 requests (~2-3s)
- **batch_size=60**: 1914 / 60 = 32 requests (~2-2.5s)
- **batch_size=100**: 1914 / 100 = 20 requests (~1.5-2s) ← MAX для Yelp API

**Рекомендація:** Почати з 40, протестувати, і якщо все добре - збільшити до 60.

## Висновок

✅ Batch size збільшено з 20 до 40  
✅ Очікувана економія: ~3 секунди (30% швидше)  
✅ Паралельність залишається максимальною  
✅ Менше навантаження на Yelp API  
✅ Безпечно і легко rollback  

**Готово до тестування!** 🚀

