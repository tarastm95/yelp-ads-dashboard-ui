# 🔄 ЯК ПРАЦЮЄ СИНХРОНІЗАЦІЯ ПРОГРАМ

## 📋 Загальна Схема

```
┌─────────────────────────────────────────────────────────────────┐
│                    СИНХРОНІЗАЦІЯ ПРОГРАМ                        │
└─────────────────────────────────────────────────────────────────┘

1️⃣  АВТОМАТИЧНА СИНХРОНІЗАЦІЯ (при завантаженні сторінки)
    ↓
    Frontend: ProgramsList.tsx → useEffect() → handleSyncWithSSE(true)
    ↓
    Backend: /api/reseller/programs/sync-stream (POST)
    ↓
    ProgramSyncService.sync_programs()
    ↓
    Перевіряє: API total_count vs БД total_count
    ↓
    Якщо API > БД → завантажує нові програми
    ↓
    Зберігає в БД (ProgramRegistry)

2️⃣  РУЧНА СИНХРОНІЗАЦІЯ (кнопка "Sync Programs")
    ↓
    Той самий процес, але з повідомленням користувачу
```

## 🔍 Детальний Процес

### 1. Автоматична Синхронізація

**Коли відбувається:**
- При завантаженні сторінки `/programs`
- Тільки якщо користувач автентифікований (є username + password)

**Код (Frontend):**
```typescript
// ProgramsList.tsx, рядок 352-357
useEffect(() => {
  if (isAuthenticated) {
    console.log('🚀 [AUTO-SYNC] Component mounted, starting automatic sync...');
    handleSyncWithSSE(true); // isAutomatic = true
  }
}, []); // Запускається тільки один раз при mount
```

**Що робить:**
1. Відправляє POST запит на `/api/reseller/programs/sync-stream`
2. Отримує SSE (Server-Sent Events) stream з прогресом
3. Показує прогрес синхронізації (якщо є нові програми)
4. Після завершення оновлює список програм

### 2. Backend Логіка

**Endpoint:** `POST /api/reseller/programs/sync-stream`

**Код (Backend):**
```python
# views.py - ProgramSyncStreamView
def post(self, request):
    username = request.user.username
    
    # 1. Перевіряє скільки програм в API
    api_total = ProgramSyncService.get_total_programs_from_api(username)
    
    # 2. Перевіряє скільки програм в БД
    db_total = ProgramSyncService.get_total_programs_in_db(username)
    
    # 3. Якщо API > БД → синхронізує різницю
    if api_total > db_total:
        new_programs = api_total - db_total
        # Завантажує нові програми батчами по 20
        sync_programs(username, batch_size=20)
    else:
        # Нічого робити не потрібно
        return "already_synced"
```

### 3. Що Зберігається в БД

**Таблиця:** `ads_programregistry`

**Поля:**
- `program_id` - унікальний ID програми
- `yelp_business_id` - ID бізнесу
- `program_name` - тип програми (CPC, BP, EP, і т.д.)
- `status` - статус (CURRENT, PAST, FUTURE, PAUSED, INACTIVE)
- `username` - користувач якому належить програма
- `created_at` - коли додано в БД
- `updated_at` - коли оновлено

**Приклад:**
```
program_id: 5O-Jk-5KbqkPClw1YvaqVA
yelp_business_id: e2JTWqyUwRHXjpG8TCZ7Ow
program_name: CPC
status: CURRENT
username: 0il7Tv&R$#6\
```

## ❓ ЧОМУ ПРОГРАМА НЕ СИНХРОНІЗУВАЛАСЯ АВТОМАТИЧНО?

### Можливі Причини:

1. **Помилка при автоматичній синхронізації**
   - Перевірте console.log в браузері (F12)
   - Шукайте помилки типу: `❌ [SSE] Sync failed`

2. **Користувач не автентифікований**
   - Якщо немає username/password в Redux store
   - Автоматична синхронізація не запуститься

3. **Endpoint недоступний**
   - `/api/reseller/programs/sync-stream` повертає 404
   - Перевірте чи працює backend

4. **CORS або мережеві помилки**
   - Блокування браузером
   - Проблеми з з'єднанням

5. **Програма створена ПІСЛЯ останньої синхронізації**
   - Автоматична синхронізація запускається тільки при завантаженні сторінки
   - Якщо ви створили програму через Yelp UI, потрібно:
     a) Оновити сторінку (F5) → автоматична синхронізація
     b) Натиснути "Sync Programs" → ручна синхронізація

## 🎯 РЕКОМЕНДАЦІЇ

### Для Користувачів:

1. **Якщо не бачите нову програму:**
   - Натисніть F5 (оновити сторінку)
   - Або натисніть "Sync Programs"

2. **Перевірте консоль браузера:**
   - F12 → Console
   - Шукайте `🚀 [AUTO-SYNC]` або `❌ [SSE]`

### Для Розробників:

1. **Додати логування:**
   ```typescript
   console.log('🚀 [AUTO-SYNC] Starting...');
   console.log('📊 [SSE] Event received:', eventData);
   console.log('✅ [SSE] Completed');
   ```

2. **Додати toast повідомлення:**
   ```typescript
   if (eventData.type === 'complete' && eventData.added > 0) {
     toast({
       title: "Programs Synced",
       description: `Added ${eventData.added} new programs`,
     });
   }
   ```

3. **Додати індикатор синхронізації:**
   - Показувати spinner під час автоматичної синхронізації
   - Показувати кількість нових програм

## 🔧 НАЛАШТУВАННЯ

### Інтервал Автоматичної Синхронізації:

**Зараз:** Тільки при завантаженні сторінки (один раз)

**Можна додати періодичну синхронізацію:**
```typescript
useEffect(() => {
  if (isAuthenticated) {
    // Синхронізація кожні 5 хвилин
    const interval = setInterval(() => {
      handleSyncWithSSE(true);
    }, 5 * 60 * 1000); // 5 хвилин
    
    return () => clearInterval(interval);
  }
}, [isAuthenticated]);
```

### Розмір Батчу:

**Зараз:** 20 програм за раз

**Можна змінити в:**
```python
# views.py - ProgramSyncStreamView
result = ProgramSyncService.sync_programs(username, batch_size=50)  # Збільшити до 50
```

## 📊 СТАТИСТИКА СИНХРОНІЗАЦІЇ

Перевірити скільки програм синхронізовано:

```sql
-- Загальна кількість програм
SELECT COUNT(*) FROM ads_programregistry;

-- По користувачам
SELECT username, COUNT(*) 
FROM ads_programregistry 
GROUP BY username;

-- По статусам
SELECT status, COUNT(*) 
FROM ads_programregistry 
WHERE username = '0il7Tv&R$#6\' 
GROUP BY status;
```

## 🐛 ДЕБАГ

### Перевірити чи працює автоматична синхронізація:

1. Відкрийте консоль браузера (F12)
2. Перейдіть на `/programs`
3. Шукайте в консолі:
   ```
   🚀 [AUTO-SYNC] Component mounted, starting automatic sync...
   🔄 [SSE] Automatic sync triggered
   📡 [SSE] Connected to sync stream
   📊 [SSE] Event received: {...}
   ✅ [SSE] Stream completed
   ```

### Якщо не працює:

1. Перевірте `isAuthenticated`:
   ```javascript
   console.log('isAuthenticated:', isAuthenticated);
   console.log('username:', username);
   console.log('password:', password ? '***' : 'missing');
   ```

2. Перевірте endpoint:
   ```bash
   curl -X POST "http://localhost:8000/api/reseller/programs/sync-stream" \
     -u "username:password" \
     -H "Content-Type: application/json"
   ```

3. Перевірте логи backend:
   ```bash
   docker logs yelp-ads-dashboard-ui-backend-1 -f
   ```

## ✅ ВИСНОВОК

**Автоматична синхронізація працює**, але:
- Запускається тільки при завантаженні сторінки
- Потребує автентифікації
- Може мовчки завершитися якщо немає нових програм

**Рекомендація:** Додати візуальний індикатор автоматичної синхронізації, щоб користувач бачив що процес відбувся.
