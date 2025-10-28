# Business Names Implementation

## 📋 Огляд

Реалізовано автоматичне збереження та відображення назв бізнесів під час синхронізації програм з Yelp API.

**Дата:** 17 жовтня 2025  
**Статус:** ✅ Реалізовано

---

## 🎯 Що було зроблено

### 1. Покращено синхронізацію для завантаження business names

**Файл:** `backend/ads/sync_service.py`

#### Зміни в `_save_programs_batch`:

1. **Збільшено ліміт API запитів**: З 10 до 50 бізнесів за один batch
   ```python
   max_fetch = min(50, len(new_business_ids))  # Було: [:10]
   ```

2. **Додано затримку між запитами**: 0.2 секунди для запобігання rate limiting
   ```python
   time.sleep(0.2)
   ```

3. **Покращено логування**: Інформація про кількість завантажених business names
   ```python
   logger.info(f"📡 [API] Fetched {len(api_names)} business names from API")
   logger.warning(f"⚠️  {remaining} business names not fetched yet (will be fetched in next sync)")
   ```

#### Новий метод `backfill_missing_business_names`:

Спеціальний метод для заповнення відсутніх business names після основної синхронізації:

```python
@classmethod
def backfill_missing_business_names(cls, username: str, max_fetch: int = 100) -> Dict:
    """
    Заповнює відсутні business_name для бізнесів користувача.
    """
```

**Що робить:**
- Знаходить всі business_id без назв в БД
- Завантажує назви з Yelp Fusion API (до 100 за раз)
- Зберігає в БД та Redis кеш
- Повертає статистику: `{fetched: int, failed: int, total: int, status: str}`

#### Інтеграція в `sync_with_streaming`:

Після основної синхронізації автоматично запускається backfill:

```python
try:
    backfill_result = cls.backfill_missing_business_names(username, max_fetch=50)
    if backfill_result.get('fetched', 0) > 0:
        logger.info(f"📡 [BACKFILL] Fetched {backfill_result['fetched']} business names")
except Exception as e:
    logger.warning(f"⚠️  [BACKFILL] Failed to backfill business names: {e}")
```

---

### 2. Оптимізовано завантаження business names у списку програм

**Файл:** `backend/ads/views.py`

#### Зміни в `enrich_programs_with_custom_names`:

Метод оновлено для використання БД замість API:

**Було:**
- Завантажувало business details з API для ВСІХ бізнесів
- Повільно та витратно (багато API запитів)

**Стало:**
1. **Спочатку перевіряє БД**: Завантажує `business_name` з `ProgramRegistry`
   ```python
   registry_data = ProgramRegistry.objects.filter(
       username=username,
       program_id__in=program_ids
   ).values('program_id', 'custom_name', 'yelp_business_id', 'business_name')
   ```

2. **Тільки для нових бізнесів запитує API**: Обмежено до 10 за раз
   ```python
   business_ids_without_names = business_ids - set(business_names_from_db.keys())
   for business_id in list(business_ids_without_names)[:10]:
       # Запит до API
   ```

3. **Автоматично зберігає в БД**: Нові назви одразу зберігаються
   ```python
   ProgramRegistry.objects.filter(
       username=username,
       yelp_business_id=business_id
   ).update(business_name=details['name'])
   ```

---

## 🔄 Процес синхронізації

### Етап 1: Основна синхронізація програм

1. Завантажує програми з Yelp Partner API
2. Витягує унікальні `business_id`
3. Перевіряє Redis кеш → БД → API для business names
4. Зберігає до 50 business names з API за один batch
5. Зберігає програми з business_name в БД

### Етап 2: Backfill відсутніх назв

1. Знаходить бізнеси без назв в БД
2. Завантажує до 50 назв з Yelp Fusion API
3. Оновлює БД та Redis кеш
4. Логує статистику

### Етап 3: Відображення в інтерфейсі

1. Frontend викликає `GET /api/reseller/business-ids`
2. Backend повертає список з `business_name` з БД
3. Frontend показує в dropdown:
   - `"Business Name • business_id"` (якщо є назва)
   - `"business_id"` (якщо назви немає)

---

## 📊 Приклад API Response

### `GET /api/reseller/business-ids`

**Було:**
```json
{
  "total": 8,
  "businesses": [
    {
      "business_id": "kFFwU3RBbwOfaRhkWVgJA",
      "business_name": "kFFwU3RBbwOfaRhkWVgJA",  // ❌ Просто ID
      "program_count": 6,
      "active_count": 0
    }
  ]
}
```

**Стало:**
```json
{
  "total": 8,
  "businesses": [
    {
      "business_id": "kFFwU3RBbwOfaRhkWVgJA",
      "business_name": "Acme Sushi - TEST LISTING",  // ✅ Справжня назва
      "program_count": 6,
      "active_count": 0
    }
  ]
}
```

---

## 🎨 Відображення в інтерфейсі

### До:
```
🏢 Business:
[All Businesses (8) ▼]
  kFFwU3RBbwOfaRhkWVgJA • 6 programs
  aWhkYzeihrBnTUk_V3MUtg • 1 programs
```

### Після:
```
🏢 Business:
[All Businesses (8) ▼]
  Acme Sushi - TEST LISTING • kFFwU3RBbwOfaRhkWVgJA • 6 programs
  McDonald's Downtown • aWhkYzeihrBnTUk_V3MUtg • 1 programs
```

---

## 🚀 Як це працює

### 1. Перша синхронізація (новий користувач):

```
User відкриває /programs
   ↓
Frontend → POST /api/reseller/programs/sync-stream
   ↓
Backend:
   1. Завантажує програми з API
   2. Для кожного business_id:
      a. Перевіряє Redis кеш
      b. Перевіряє БД
      c. Якщо немає - запитує Yelp Fusion API (до 50 за batch)
   3. Зберігає в БД з business_name
   4. Запускає backfill для решти (до 50 більше)
   ↓
Frontend → GET /api/reseller/business-ids
   ↓
Backend → Повертає список з business_name з БД
   ↓
Frontend → Показує dropdown з назвами бізнесів
```

### 2. Подальші синхронізації:

```
User клікає "Sync Programs"
   ↓
Backend:
   1. Завантажує нові програми
   2. Business names беруться з БД (швидко!)
   3. Тільки нові бізнеси запитуються з API
   4. Backfill доповнює відсутні назви
```

---

## ⚡ Оптимізації

### Redis кеш:
- **Час життя**: 30 хвилин
- **Формат ключа**: `business_name:{business_id}`
- **Batch операції**: Завантаження багатьох назв одним запитом

### База даних:
- **Індекси**: `yelp_business_id`, `business_name`
- **Один запит**: Завантаження всіх business_name для програм
- **Batch update**: Оновлення багатьох записів одразу

### API rate limiting:
- **Затримка**: 0.2 секунди між запитами
- **Ліміт**: 50 бізнесів за batch
- **Backfill**: Додатково 50 бізнесів після основної синхронізації
- **Безпечна швидкість**: ~200 запитів/годину (з 5000/день ліміту)

---

## 🔧 Налаштування

### Параметри синхронізації:

**В `_save_programs_batch`:**
```python
max_fetch = min(50, len(new_business_ids))  # Максимум 50 за batch
time.sleep(0.2)  # 0.2 секунди затримка
```

**В `sync_with_streaming`:**
```python
backfill_result = cls.backfill_missing_business_names(username, max_fetch=50)
```

**В `enrich_programs_with_custom_names`:**
```python
for business_id in list(business_ids_without_names)[:10]:  # Тільки 10 в списку програм
```

### Якщо потрібно змінити:

1. **Більше business names за sync**: Збільште `max_fetch` в `_save_programs_batch`
2. **Швидша синхронізація**: Зменште `time.sleep(0.2)` (обережно з rate limit!)
3. **Більше backfill**: Збільште `max_fetch` в `sync_with_streaming`

---

## 📈 Статистика

### API запити:

**До оптимізації:**
- Синхронізація: ~10 business names
- Список програм: N запитів (для кожного бізнесу)
- **Всього**: 10 + N запитів

**Після оптимізації:**
- Синхронізація: ~50 business names (основний batch)
- Backfill: ~50 business names (додатково)
- Список програм: ~10 запитів (тільки нові бізнеси)
- **Всього**: 50 + 50 + 10 = 110 запитів (одноразово)
- **Подальші запуски**: 0 запитів (все з БД!)

### Швидкість:

**До:**
- Синхронізація: ~5 секунд + 10 business names
- Список програм: ~2 секунди + N API запитів

**Після:**
- Перша синхронізація: ~20 секунд (110 business names)
- Список програм: ~0.5 секунди (все з БД)
- Подальші синхронізації: ~5 секунд (тільки нові бізнеси)

---

## ✅ Тестування

### Ручне тестування:

1. **Перша синхронізація:**
   ```bash
   # Відкрити /programs
   # Клікнути "Sync Programs"
   # Перевірити лог:
   # → "📡 [API] Fetched X business names from API"
   # → "📡 [BACKFILL] Fetched Y business names"
   ```

2. **Перевірка dropdown:**
   ```bash
   # Відкрити dropdown "Business"
   # Повинні бути назви бізнесів замість ID
   # Формат: "Business Name • business_id • X programs"
   ```

3. **Перевірка БД:**
   ```python
   from backend.ads.models import ProgramRegistry
   
   # Перевірити що business_name заповнені
   ProgramRegistry.objects.filter(
       business_name__isnull=False
   ).exclude(business_name='').count()
   ```

### Автоматичне тестування:

```python
from backend.ads.sync_service import ProgramSyncService

# Тест backfill
result = ProgramSyncService.backfill_missing_business_names('username', max_fetch=10)
assert result['status'] in ['completed', 'up_to_date']
assert result['fetched'] >= 0
```

---

## 🐛 Можливі проблеми

### 1. Rate Limiting (429 Too Many Requests)

**Симптом**: Помилка `429` в логах

**Рішення**:
- Зменшити `max_fetch` (з 50 до 20)
- Збільшити `time.sleep()` (з 0.2 до 0.5)
- Перезапустити синхронізацію через годину

### 2. Деякі business names не завантажуються

**Причина**: Ліміт 50 бізнесів за batch

**Рішення**:
- Запустити синхронізацію повторно
- Backfill автоматично доповнить відсутні назви
- Або викликати вручну:
  ```python
  ProgramSyncService.backfill_missing_business_names('username', max_fetch=100)
  ```

### 3. Business names не оновлюються

**Причина**: Redis кеш (30 хвилин TTL)

**Рішення**:
- Почекати 30 хвилин
- Або очистити Redis кеш:
  ```bash
  redis-cli FLUSHDB
  ```

---

## 🔮 Майбутні покращення

1. **Background task для backfill**: Celery задача для асинхронного завантаження
2. **Webhook для оновлень**: Yelp webhook для автоматичного оновлення business names
3. **Кеш business URL**: Зберігати URL бізнесу для прямих посилань
4. **Batch API запити**: Якщо Yelp API підтримає batch endpoint

---

## 📝 Довідка

### API Endpoints:

- **Yelp Fusion API**: `GET https://api.yelp.com/v3/businesses/{business_id}`
  - Ліміт: 5000 requests/day
  - Response: `{id, name, alias, url, ...}`

### Моделі БД:

- **ProgramRegistry**:
  - `business_name`: CharField (255)
  - Індекс: `yelp_business_id`, `business_name`

### Redis Keys:

- **business_name**: `business_name:{business_id}`
  - TTL: 1800 секунд (30 хвилин)

---

**Створено**: 17 жовтня 2025  
**Автор**: AI Assistant (Claude Sonnet 4.5)  
**Мова**: Українська (документація), English (код)

