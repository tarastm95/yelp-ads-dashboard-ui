# Реалізація збереження назв бізнесів

## ✅ Що зроблено

Реалізовано автоматичне завантаження та збереження назв бізнесів з Yelp Fusion API під час синхронізації програм.

### 🎯 Головні зміни:

1. **Покращена синхронізація** (`backend/ads/sync_service.py`):
   - Збільшено ліміт з 10 до 50 business names за один batch
   - Додано затримку 0.2 секунди між API запитами (запобігання rate limit)
   - Створено новий метод `backfill_missing_business_names()` для завантаження відсутніх назв
   - Інтегровано backfill в процес синхронізації (автоматично після основної синхронізації)

2. **Оптимізація списку програм** (`backend/ads/views.py`):
   - Метод `enrich_programs_with_custom_names()` тепер спочатку перевіряє БД
   - Тільки для нових бізнесів робляться API запити (максимум 10)
   - Автоматичне збереження нових business names в БД

3. **Кешування**:
   - Redis кеш для business names (TTL: 30 хвилин)
   - Batch операції для завантаження з кешу

### 📊 Як це працює:

#### При першій синхронізації:
```
1. Користувач натискає "Sync Programs"
2. Backend завантажує програми з Yelp Partner API
3. Для кожного business_id:
   - Перевіряє Redis кеш
   - Якщо немає - перевіряє БД
   - Якщо немає - робить запит до Yelp Fusion API
   - Зберігає назву в БД і Redis
4. Після основної синхронізації:
   - Запускається backfill для відсутніх назв (до 50)
5. Frontend отримує список з назвами бізнесів
6. В dropdown показуються назви замість ID
```

#### API запит для отримання назви бізнесу:
```http
GET https://api.yelp.com/v3/businesses/Lo6ye25DRwOJZ1QiXBg3Vw

Response:
{
    "id": "Lo6ye25DRwOJZ1QiXBg3Vw",
    "name": "Acme Sushi - TEST LISTING",
    "url": "https://www.yelp.com/biz/...",
    ...
}
```

Назва `"Acme Sushi - TEST LISTING"` зберігається в БД в полі `business_name`.

### 🎨 Що бачить користувач:

#### Раніше:
```
🏢 Business:
[All Businesses (8) ▼]
  kFFwU3RBbwOfaRhkWVgJA • 6 programs
  aWhkYzeihrBnTUk_V3MUtg • 1 programs
```

#### Тепер:
```
🏢 Business:
[All Businesses (8) ▼]
  Acme Sushi - TEST LISTING • kFFwU3RBbwOfaRhkWVgJA • 6 programs
  McDonald's Downtown • aWhkYzeihrBnTUk_V3MUtg • 1 programs
```

### ⚡ Оптимізації:

1. **Redis кеш**: Назви бізнесів кешуються на 30 хвилин
2. **Batch операції**: Завантаження багатьох назв одним запитом до БД
3. **Rate limiting**: 0.2 секунди затримка між API запитами
4. **Прогресивне завантаження**: 
   - 50 назв під час основної синхронізації
   - 50 назв під час backfill
   - 10 назв при перегляді списку програм

### 📈 Статистика:

- **Перша синхронізація**: ~110 business names (50 + 50 + 10)
- **Подальші синхронізації**: Тільки нові бізнеси
- **Список програм**: Все з БД (0 API запитів!)

### 🧪 Тестування:

Запустіть тестовий скрипт:
```bash
cd /var/www/yelp-ads-dashboard-ui
python backend/test_business_names.py
```

Скрипт перевірить:
1. ✅ Чи є business names в БД
2. 📡 Чи працює backfill
3. 🔍 Чи повертає BusinessIdsView назви
4. 📋 Приклад конкретного бізнесу

### 🚀 Що далі:

1. **Запустити синхронізацію**: Натисніть "Sync Programs" в інтерфейсі
2. **Перевірити dropdown**: Відкрийте фільтр "Business" - повинні бути назви
3. **Якщо назв немає**: Почекайте 1-2 хвилини (backfill може зайняти час)

### 🐛 Можливі проблеми:

**Проблема**: Деякі business names не завантажуються  
**Рішення**: Запустіть синхронізацію повторно - backfill доповнить відсутні назви

**Проблема**: Помилка 429 (Rate Limit)  
**Рішення**: Почекайте годину і запустіть знову

### 📝 Технічні деталі:

**Змінені файли:**
- `backend/ads/sync_service.py` - логіка синхронізації
- `backend/ads/views.py` - оптимізація списку програм
- `frontend/` - без змін (вже підтримує business_name)

**Нові методи:**
- `ProgramSyncService.backfill_missing_business_names()` - заповнення відсутніх назв

**База даних:**
- Поле `business_name` в моделі `ProgramRegistry` (вже існує)
- Індекси на `yelp_business_id` та `business_name`

**API:**
- Yelp Fusion API: `GET /v3/businesses/{business_id}`
- Ліміт: 5000 requests/day

---

**Створено**: 17 жовтня 2025  
**Статус**: ✅ Готово до тестування

