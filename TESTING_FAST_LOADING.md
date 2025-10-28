# 🧪 Тестування Fast Loading

## Як перевірити що fast loading працює

### 1️⃣ Відкрити DevTools Console

В браузері натисніть `F12` → перейдіть на вкладку **Console**

### 2️⃣ Перейти на сторінку Programs

Відкрийте: `http://localhost:8080/programs`

### 3️⃣ Перевірити логи в консолі

Ви побачите один з двох варіантів:

#### Варіант A: Fast Loading (для великих datasets)
```javascript
⚡ Fast loading 1914 programs in ONE request...
```

**Це означає:**
- Всього програм ≥ 500
- Система автоматично використала fast loading
- Всі програми завантажились **одним запитом**

#### Варіант B: Paginated Loading (для малих datasets)
```javascript
📄 Paginated loading 312 programs...
```

**Це означає:**
- Всього програм < 500
- Система використала звичайну пагінацію
- Програми завантажуються **по 100 за запит**

### 4️⃣ Перевірити Network tab

Перейдіть на вкладку **Network** в DevTools:

#### Fast Loading (≥500 programs):
```
✅ GET /api/reseller/programs?offset=0&limit=100&program_status=ALL  (first page)
✅ GET /api/reseller/programs?all=true&program_status=ALL             (fast load)
```
**Total: 2 запити**

#### Paginated Loading (<500 programs):
```
✅ GET /api/reseller/programs?offset=0&limit=100&program_status=CURRENT
✅ GET /api/reseller/programs?offset=100&limit=100&program_status=CURRENT
✅ GET /api/reseller/programs?offset=200&limit=100&program_status=CURRENT
✅ GET /api/reseller/programs?offset=300&limit=100&program_status=CURRENT
```
**Total: 4 запити**

---

## 📊 Тестування різних фільтрів

### Фільтр "ALL" (1914 programs)
1. Виберіть **Status: ALL**
2. Консоль покаже: `⚡ Fast loading 1914 programs in ONE request...`
3. Network tab: **2 запити** (firstPage + fastLoad)

### Фільтр "CURRENT" (312 programs)
1. Виберіть **Status: CURRENT**
2. Консоль покаже: `📄 Paginated loading 312 programs...`
3. Network tab: **4 запити** (paginated)

### Фільтр "INACTIVE" (1602 programs)
1. Виберіть **Status: INACTIVE**
2. Консоль покаже: `⚡ Fast loading 1602 programs in ONE request...`
3. Network tab: **2 запити** (fast load, бо ≥500)

---

## 🔍 Backend логи

В backend логах ви також побачите індикатори fast loading:

### Fast loading активовано:
```bash
$ docker compose logs -f backend | grep "FAST MODE"

backend-1  | 2025-10-17 15:43:25,544 [INFO] ads.views: ⚡ FAST MODE: Loading ALL 1914 programs in ONE request...
```

### Звичайна пагінація:
```bash
$ docker compose logs -f backend | grep "Found.*program_ids"

backend-1  | 2025-10-17 15:43:25,547 [INFO] ads.views: 📊 Found 100 program_ids (total: 312)
```

---

## ⚙️ Зміна порогу fast loading

Якщо хочете змінити поріг (наприклад, використовувати fast loading для datasets ≥300):

1. Відкрийте `frontend/src/hooks/useProgramsSearch.ts`
2. Знайдіть рядок:
   ```typescript
   const FAST_LOAD_THRESHOLD = 500;
   ```
3. Змініть на бажане значення:
   ```typescript
   const FAST_LOAD_THRESHOLD = 300;  // Тепер fast load для ≥300 programs
   ```
4. Перезапустіть frontend:
   ```bash
   docker compose restart frontend
   ```

---

## 📈 Очікувані результати

### Таймінги в Network tab:

| Запит | Кількість програм | Час |
|-------|-------------------|-----|
| First page (offset=0, limit=100) | 100 | ~25ms |
| Fast load (all=true) | 1914 | ~300ms |
| Paginated page | 100 | ~25ms |

### Загальний час завантаження:

| Фільтр | Програм | Запитів | Час |
|--------|---------|---------|-----|
| ALL | 1914 | 2 (fast) | ~325ms ✅ |
| CURRENT | 312 | 4 (paginated) | ~100ms ✅ |
| INACTIVE | 1602 | 2 (fast) | ~300ms ✅ |

---

## ✅ Checklist для тестування

- [ ] Консоль показує `⚡ Fast loading` для ALL (1914 programs)
- [ ] Консоль показує `📄 Paginated loading` для CURRENT (312 programs)
- [ ] Network tab показує 2 запити для ALL
- [ ] Network tab показує 4 запити для CURRENT
- [ ] Backend логи показують `⚡ FAST MODE` для ALL
- [ ] Всі програми відображаються коректно
- [ ] Business names відображаються замість business IDs
- [ ] Фільтри працюють швидко (<500ms)

---

## 🐛 Troubleshooting

### Проблема: Завжди пагінація, навіть для ALL

**Рішення:**
```bash
# Перевірте frontend логи
docker compose logs frontend --tail 50

# Перезапустіть frontend
docker compose restart frontend
```

### Проблема: Помилка в консолі "useLazyGetAllProgramsFastQuery is not a function"

**Рішення:**
```bash
# Перевірте що експорт існує
grep "useLazyGetAllProgramsFastQuery" frontend/src/store/api/yelpApi.ts

# Якщо немає - додайте:
# useLazyGetAllProgramsFastQuery,  // в export списку
```

### Проблема: Backend логи показують помилки "load_all"

**Рішення:**
```bash
# Перевірте backend код
docker compose exec backend grep -n "load_all" ads/views.py

# Має бути:
# load_all = request.query_params.get('all', 'false').lower() == 'true'
```

---

## 🎉 Успішне тестування виглядає так:

### Console:
```
⚡ Fast loading 1914 programs in ONE request...
```

### Network tab:
```
GET /api/reseller/programs?offset=0&limit=100  → 200 (25ms)
GET /api/reseller/programs?all=true            → 200 (300ms)
```

### Backend logs:
```
backend-1  | ⚡ FAST MODE: Loading ALL 1914 programs in ONE request...
backend-1  | ⚡ Fetching 1914 programs from DB in ONE query...
backend-1  | ✅ Returning 1914 programs from database
```

### UI:
- ✅ Всі 1914 програми відображаються
- ✅ Business names відображаються (не IDs)
- ✅ Завантаження швидке (~0.3s)
- ✅ Немає зависань інтерфейсу

**Якщо всі пункти ✅ - fast loading працює ідеально!** 🚀

