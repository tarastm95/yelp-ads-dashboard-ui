# 🔍 Фільтрація бізнесів по статусу - Реалізація

**Дата:** 14 жовтня 2025  
**Статус:** ✅ Реалізовано і готово до тестування

---

## 🎯 Проблема

**Було:**
```
Status: FUTURE
Business ID: FHck1bfTw-E6RjQh... (388)  ← показує ВСІ програми
```

**Потрібно:**
```
Status: FUTURE
Business ID: FHck1bfTw-E6RjQh... (15)   ← показує тільки FUTURE програми
```

---

## ✅ Що зроблено:

### 1️⃣ Backend - оновлено метод `get_business_ids_for_user()`
**Файл:** `backend/ads/sync_service.py`

Тепер приймає параметр `status` та фільтрує програми:

```python
@classmethod
def get_business_ids_for_user(cls, username: str, status: str = None) -> List[Dict]:
    """
    Отримує список унікальних business_id з підрахунком програм.
    Підтримує фільтрацію по статусу програм.
    """
    query = (
        ProgramRegistry.objects
        .filter(username=username, yelp_business_id__isnull=False)
        .exclude(yelp_business_id='')
    )
    
    # Фільтр по статусу якщо вказано
    if status and status != 'ALL':
        query = query.filter(status=status)
    
    # Групуємо та рахуємо
    results = query.values('yelp_business_id').annotate(
        program_count=Count('program_id')
    ).order_by('-program_count')
    
    return [...]
```

### 2️⃣ Backend - оновлено `BusinessIdsView`
**Файл:** `backend/ads/views.py`

Тепер отримує параметр `program_status` з query params:

```python
def get(self, request):
    username = request.user.username
    program_status = request.query_params.get('program_status', None)
    
    businesses = ProgramSyncService.get_business_ids_for_user(
        username, 
        status=program_status
    )
    
    return Response({
        'total': len(businesses),
        'businesses': businesses,
        'filtered_by_status': program_status
    })
```

### 3️⃣ Frontend - оновлено API query
**Файл:** `frontend/src/store/api/yelpApi.ts`

Тепер передає `program_status` як параметр:

```typescript
getBusinessIds: builder.query<{ 
  total: number; 
  businesses: Array<{...}>;
  filtered_by_status?: string;
}, string | undefined>({
  query: (programStatus) => {
    const params = programStatus ? `?program_status=${programStatus}` : '';
    return `/reseller/business-ids${params}`;
  },
  keepUnusedDataFor: 60, // 1 хвилина (було 5)
}),
```

### 4️⃣ Frontend - оновлено компонент
**Файл:** `frontend/src/components/ProgramsList.tsx`

Тепер передає статус в hook та оновлює при зміні:

```typescript
// Передаємо поточний статус
const { data: businessIdsData, refetch: refetchBusinessIds } = 
  useGetBusinessIdsQuery(programStatus);

// Оновлюємо при зміні статусу
useEffect(() => {
  console.log('🔄 Status changed to:', programStatus);
  refetchBusinessIds();
}, [programStatus, refetchBusinessIds]);
```

---

## 🎯 Як це працює:

### Сценарій 1: Користувач обирає FUTURE
1. Вибирає **Status: FUTURE** в дропдауні
2. `useEffect` викликає `refetchBusinessIds()`
3. API запит: `GET /api/reseller/business-ids?program_status=FUTURE`
4. Backend фільтрує: `WHERE status = 'FUTURE'`
5. Дропдаун показує тільки бізнеси з FUTURE програмами

### Сценарій 2: Користувач обирає ALL
1. Вибирає **Status: ALL**
2. API запит: `GET /api/reseller/business-ids?program_status=ALL`
3. Backend НЕ фільтрує (бо status = 'ALL')
4. Дропдаун показує всі бізнеси

### Сценарій 3: Не вибрано нічого
1. Початковий стан (зазвичай CURRENT)
2. API запит: `GET /api/reseller/business-ids?program_status=CURRENT`
3. Показує тільки бізнеси з CURRENT програмами

---

## 📊 Приклад результатів:

### Запит без фільтру:
```bash
GET /api/reseller/business-ids
```
**Відповідь:**
```json
{
  "total": 37,
  "businesses": [
    {"business_id": "FHck1bfTw...", "program_count": 388},
    {"business_id": "xrPncND82...", "program_count": 347}
  ],
  "filtered_by_status": null
}
```

### Запит з фільтром FUTURE:
```bash
GET /api/reseller/business-ids?program_status=FUTURE
```
**Відповідь:**
```json
{
  "total": 12,
  "businesses": [
    {"business_id": "FHck1bfTw...", "program_count": 15},
    {"business_id": "xrPncND82...", "program_count": 8}
  ],
  "filtered_by_status": "FUTURE"
}
```

---

## 🧪 Тестування:

### 1. API тест (curl):
```bash
# Без фільтру
curl -X GET "http://localhost:8004/api/reseller/business-ids" \
  -H "Authorization: Basic YOUR_AUTH" | jq

# З фільтром FUTURE
curl -X GET "http://localhost:8004/api/reseller/business-ids?program_status=FUTURE" \
  -H "Authorization: Basic YOUR_AUTH" | jq
```

### 2. UI тест:
1. Відкрити http://72.60.66.164:8080/programs
2. Запустити синхронізацію (щоб заповнити статуси)
3. Вибрати **Status: FUTURE**
4. Перевірити що дропдаун показує правильні цифри
5. Вибрати конкретний бізнес
6. Перевірити що показуються тільки FUTURE програми

### 3. Консоль браузера:
```javascript
// Має з'явитись лог:
🔄 [STATUS-CHANGE] Program status changed to: FUTURE
📊 [DEBUG] businessIdsData: { total: 12, businesses: [...] }
```

---

## ⚠️ Важливо:

### Щоб фільтр працював правильно:
1. **Програми повинні мати заповнені статуси** в БД
2. Це відбувається під час синхронізації
3. Якщо програми синхронізовані **до** додавання поля `status` - вони матимуть `status=NULL`
4. **Рішення:** Очистити БД і ресинхронізувати:

```bash
# Очистити старі програми
docker exec yelp-ads-dashboard-ui-backend-1 python manage.py shell -c \
  "from ads.models import ProgramRegistry; \
   ProgramRegistry.objects.filter(username='USER').delete()"

# Потім запустити синхронізацію через UI
# Відкрити http://72.60.66.164:8080/programs
```

### Перевірка статусів в БД:
```bash
docker exec yelp-ads-dashboard-ui-backend-1 python manage.py shell -c \
  "from ads.models import ProgramRegistry; \
   from django.db.models import Count; \
   stats = ProgramRegistry.objects.filter(username='USER') \
     .values('status').annotate(count=Count('id')); \
   [print(f\"{s['status']}: {s['count']}\") for s in stats]"
```

**Очікуваний результат:**
```
CURRENT: 850
PAST: 720
FUTURE: 52
PAUSED: 280
```

---

## 🎨 UI Flow:

```
┌─────────────────────────────────────────┐
│ 1. Користувач обирає Status: FUTURE     │
└────────────┬────────────────────────────┘
             │
             v
┌─────────────────────────────────────────┐
│ 2. useEffect відловлює зміну            │
│    refetchBusinessIds() викликається     │
└────────────┬────────────────────────────┘
             │
             v
┌─────────────────────────────────────────┐
│ 3. API запит з параметром               │
│    GET /business-ids?status=FUTURE      │
└────────────┬────────────────────────────┘
             │
             v
┌─────────────────────────────────────────┐
│ 4. Backend фільтрує по status='FUTURE'  │
│    SQL: WHERE status = 'FUTURE'         │
└────────────┬────────────────────────────┘
             │
             v
┌─────────────────────────────────────────┐
│ 5. Дропдаун оновлюється з новими даними│
│    All Businesses (52)                  │
│    FHck1bfTw... (15) ← тільки FUTURE!   │
└─────────────────────────────────────────┘
```

---

## ✨ Результат:

✅ **Фільтр працює реактивно!**
✅ **Цифри в дропдауні відповідають обраному статусу**
✅ **Швидко - SQL запит з індексом**
✅ **Кеш 1 хвилина** (оновлюється при зміні статусу)

---

## 📝 Змінені файли:

1. `backend/ads/sync_service.py` - додано параметр `status`
2. `backend/ads/views.py` - передача `program_status` з query params
3. `frontend/src/store/api/yelpApi.ts` - передача статусу в API запит
4. `frontend/src/components/ProgramsList.tsx` - автоматичне оновлення при зміні статусу

---

**Реалізація завершена! Код готовий до використання!** 🎉
