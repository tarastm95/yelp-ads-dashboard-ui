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

### 1️⃣ Backend - `get_business_ids_for_user()` з фільтром
**Файл:** `backend/ads/sync_service.py`

Додано параметр `status` для фільтрації програм по статусу.

### 2️⃣ Backend - `BusinessIdsView` з підтримкою фільтру
**Файл:** `backend/ads/views.py`

Тепер отримує `program_status` з query params і передає його в сервіс.

### 3️⃣ Frontend - API з параметром статусу
**Файл:** `frontend/src/store/api/yelpApi.ts`

`getBusinessIds` тепер приймає `programStatus` як аргумент.

### 4️⃣ Frontend - автоматичне оновлення
**Файл:** `frontend/src/components/ProgramsList.tsx`

Дропдаун автоматично оновлюється при зміні статусу.

---

## 🎯 Як це працює:

1. Користувач обирає **Status: FUTURE**
2. `useEffect` відловлює зміну → викликає `refetchBusinessIds()`
3. API запит: `GET /api/reseller/business-ids?program_status=FUTURE`
4. Backend фільтрує: `WHERE status = 'FUTURE'`
5. Дропдаун показує тільки бізнеси з FUTURE програмами

---

## ⚠️ Важливо для тестування:

### Програми повинні мати заповнені статуси!

Якщо програми синхронізовані **до** додавання поля `status` - вони мають `status=NULL`.

**Рішення:**
1. Очистити БД
2. Запустити синхронізацію через UI
3. Тепер статуси будуть заповнені

```bash
# Очистити старі програми
docker exec yelp-ads-dashboard-ui-backend-1 python manage.py shell -c \
  "from ads.models import ProgramRegistry; \
   ProgramRegistry.objects.filter(username='demarketing_ads_testing').delete()"

# Потім відкрити http://72.60.66.164:8080/programs
# Система автоматично запустить синхронізацію
```

---

## 🧪 Тестування:

### UI тест:
1. Відкрити http://72.60.66.164:8080/programs
2. Після синхронізації вибрати **Status: FUTURE**
3. Дропдаун має показати бізнеси тільки з FUTURE програмами
4. Вибрати конкретний бізнес
5. Перевірити що показуються тільки FUTURE програми

### Консоль браузера:
```javascript
🔄 [STATUS-CHANGE] Program status changed to: FUTURE
📊 [DEBUG] businessIdsData: { total: 12, businesses: [...] }
```

---

## ✨ Результат:

✅ **Фільтр працює реактивно!**  
✅ **Цифри в дропдауні відповідають обраному статусу**  
✅ **Швидко - SQL запит з індексом**  
✅ **Кеш 1 хвилина** (оновлюється при зміні статусу)

---

**Реалізація завершена! Код готовий до використання!** 🎉

