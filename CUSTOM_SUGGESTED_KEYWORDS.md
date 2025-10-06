# Custom Suggested Keywords Feature

## Огляд

Функціонал дозволяє додавати власні suggested keywords для NEGATIVE_KEYWORD_TARGETING feature крім тих, що надаються Yelp API.

## Особливості

### Що таке Suggested Keywords?

**Suggested Keywords** - це список до 25 ключових слів, де ваші оголошення можуть показуватися. Ці keywords:
- Базуються на типових пошуках для категорії бізнесу
- Список НЕ є вичерпним - оголошення можуть показуватись на інших пошукових запитах
- Надаються Yelp автоматично на основі категорії бізнесу

### Навіщо потрібні Custom Suggested Keywords?

1. **Розширення списку** - Yelp надає тільки до 25 слів, ви можете додати свої
2. **Специфічні для бізнесу** - додайте keywords характерні для вашої ніші
3. **Швидке блокування** - custom suggested keywords відображаються разом з Yelp keywords і можуть бути швидко заблоковані одним кліком
4. **Управління по програмах** - різні програми можуть мати різні custom keywords

## Архітектура

### Backend

#### Модель (models.py)
```python
class CustomSuggestedKeyword(models.Model):
    """Store custom suggested keywords for negative keyword targeting"""
    
    program_id = models.CharField(max_length=100, db_index=True)
    keyword = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=255, null=True, blank=True)
```

#### API Endpoints

**GET** `/api/program/{program_id}/custom-suggested-keywords`
- Отримати всі custom suggested keywords для програми
- Response: `[{id, program_id, keyword, created_at, created_by}]`

**POST** `/api/program/{program_id}/custom-suggested-keywords`
- Додати нові custom suggested keywords
- Body: `{keywords: ["keyword1", "keyword2"]}`
- Response: `{message, created: [], skipped: [], total}`

**DELETE** `/api/program/{program_id}/custom-suggested-keywords`
- Видалити custom suggested keywords
- Body: `{keywords: ["keyword1", "keyword2"]}`
- Response: `{message, deleted: number}`

#### Злиття з Yelp Keywords

У методі `YelpService.get_program_features()` автоматично об'єднуються:
1. Suggested keywords від Yelp API
2. Custom suggested keywords з бази даних
3. Дублікати видаляються
4. Результат сортується

```python
# Merge custom suggested keywords with Yelp suggested keywords
if 'features' in data and 'NEGATIVE_KEYWORD_TARGETING' in data['features']:
    negative_kw_feature = data['features']['NEGATIVE_KEYWORD_TARGETING']
    yelp_suggested = negative_kw_feature.get('suggested_keywords', [])
    
    # Get custom keywords from database
    custom_keywords = CustomSuggestedKeyword.objects.filter(
        program_id=program_id
    ).values_list('keyword', flat=True)
    
    # Merge and deduplicate
    all_suggested = list(set(yelp_suggested + list(custom_keywords)))
    negative_kw_feature['suggested_keywords'] = sorted(all_suggested)
```

### Frontend

#### Redux API (yelpApi.ts)

Додано 3 нові endpoints:
- `getCustomSuggestedKeywords` - query
- `addCustomSuggestedKeywords` - mutation
- `deleteCustomSuggestedKeywords` - mutation

При додаванні/видаленні автоматично invalidується кеш `ProgramFeatures` для перезавантаження злитих keywords.

#### UI компонент (NegativeKeywordEditor.tsx)

Додано новий розділ "Manage custom suggested keywords" з можливостями:

1. **Додавання одного keyword**
   - Input поле
   - Enter або кнопка для додавання
   - Автоматичне приведення до lowercase

2. **Bulk додавання keywords**
   - Textarea для введення кількох keywords
   - Підтримка розділювачів: коми, нові рядки
   - Автоматична дедуплікація

3. **Візуалізація**
   - Suggested keywords показуються з міткою "(Yelp + Custom)"
   - Можливість одним кліком додати suggested keyword до blocked

4. **Toast повідомлення**
   - Успішне додавання/видалення
   - Інформація про кількість доданих/пропущених keywords
   - Помилки з деталями

## Використання

### Додавання custom suggested keyword

1. Відкрийте редактор NEGATIVE_KEYWORD_TARGETING
2. Scroll до розділу "Manage custom suggested keywords" (блакитний блок)
3. Введіть keyword в поле "Add single custom keyword"
4. Натисніть Enter або кнопку "+"
5. Keyword з'явиться у списку "Suggested keywords (Yelp + Custom)"

### Bulk додавання

1. У розділі "Manage custom suggested keywords"
2. Введіть keywords у textarea "Add multiple custom keywords"
3. Розділіть їх комами або новими рядками
4. Натисніть "Add all"
5. Toast покаже скільки keywords додано і скільки пропущено (дублікати)

### Блокування suggested keyword

1. У розділі "Suggested keywords (Yelp + Custom)"
2. Клікніть на будь-який keyword
3. Він автоматично додається до списку "Blocked keywords"

## База даних

### Міграція

Файл: `backend/ads/migrations/0004_customsuggestedkeyword.py`

```bash
# Запуск міграції
cd backend
python manage.py migrate
```

### Індекси

Створено індекси на:
- `program_id` - для швидкого пошуку по програмі
- `keyword` - для пошуку конкретних keywords

### Unique constraint

`unique_together = ['program_id', 'keyword']` - запобігає дублікатам keywords в межах однієї програми.

## Валідація

### Backend
- Keywords автоматично приводяться до lowercase
- Максимальна довжина keyword: 255 символів
- Дублікати ігноруються (get_or_create)

### Frontend
- Trim і lowercase застосовуються автоматично
- Перевірка на порожні значення
- Показ пропущених дублікатів в toast

## Тестування

### Приклад використання API

```bash
# Отримати custom keywords
curl -X GET http://localhost:8000/api/program/PROG123/custom-suggested-keywords

# Додати custom keywords
curl -X POST http://localhost:8000/api/program/PROG123/custom-suggested-keywords \
  -H "Content-Type: application/json" \
  -d '{"keywords": ["emergency", "24/7", "urgent", "nearby"]}'

# Видалити custom keywords
curl -X DELETE http://localhost:8000/api/program/PROG123/custom-suggested-keywords \
  -H "Content-Type: application/json" \
  -d '{"keywords": ["emergency", "urgent"]}'
```

## Best Practices

1. **Додавайте релевантні keywords** - тільки ті які справді можуть показуватись в пошуку
2. **Використовуйте lowercase** - система автоматично конвертує, але краще одразу
3. **Групуйте по темах** - emergency services, location-based, time-related
4. **Регулярно переглядайте** - видаляйте неактуальні custom keywords
5. **Не дублюйте Yelp keywords** - система видалить дублікати, але краще не додавати

## Відмінності від Yelp Suggested Keywords

| Характеристика | Yelp Suggested | Custom Suggested |
|----------------|----------------|------------------|
| Джерело | Yelp API | Ваша база даних |
| Кількість | До 25 | Необмежено |
| Автоматично оновлюється | Так (Yelp) | Ні (вручну) |
| Специфічні для бізнесу | Загальні для категорії | Ваші власні |
| Можна видаляти | Ні | Так |
| Злиття | Автоматично в `get_program_features()` | — |

## Troubleshooting

### Keywords не відображаються
- Перевірте що міграція запущена: `python manage.py migrate`
- Перевірте що програма існує
- Перегляньте логи backend на помилки

### Дублікати keywords
- Система автоматично запобігає дублікатам в БД
- Toast покаже скільки keywords пропущено

### Keywords не зберігаються
- Перевірте що API endpoint доступний
- Перегляньте Network tab в DevTools
- Перевірте що `program_id` правильний

## Майбутні покращення

- [ ] Імпорт/експорт custom keywords між програмами
- [ ] Шаблони custom keywords для різних категорій бізнесу
- [ ] Статистика використання custom keywords
- [ ] Auto-suggestions на базі історії
- [ ] Масове управління через admin panel
