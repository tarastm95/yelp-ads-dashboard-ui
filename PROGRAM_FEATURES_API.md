# 🚀 Yelp Program Features API - Технічна документація

## 📋 Огляд

Program Features API дозволяє керувати функціями рекламних програм через Yelp Partner API. Цей модуль надає повний CRUD доступ до налаштувань функцій програм.

## 🛠️ Архітектура модуля

### Backend (Django)
```
backend/ads/
├── services.py         # YelpService методи для API викликів
├── views.py           # ProgramFeaturesView для HTTP ендпоінтів  
└── urls.py            # URL маршрутизація
```

### Frontend (React + TypeScript)
```
frontend/src/
├── store/api/yelpApi.ts    # RTK Query hooks
├── types/yelp.ts          # TypeScript типи та валідація
└── pages/ProgramFeatures.tsx # UI компонент
```

## 🔗 API Ендпоінти

### Base URL
```
https://partner-api.yelp.com (Basic Auth з YELP_API_KEY/SECRET)
```

### Маршрути модуля
```
/program/{program_id}/features/v1
```

## 📡 HTTP Методи

### 1. GET - Отримати стан функцій
```http
GET /api/program/{program_id}/features/v1
```

**Призначення:** Повертає актуальні (доступні/активні) функції для конкретної програми.

**Відповідь:**
```json
{
  "features": {
    "CUSTOM_RADIUS_TARGETING": {
      "feature_type": "CUSTOM_RADIUS_TARGETING",
      "custom_radius": 25
    },
    "AD_GOAL": {
      "feature_type": "AD_GOAL", 
      "ad_goal": "WEBSITE_CLICKS"
    }
  }
}
```

**Використання:**
- Показати поточні налаштування перед змінами
- Перевірити результат після POST/DELETE

### 2. POST - Створити/оновити функції
```http
POST /api/program/{program_id}/features/v1
Content-Type: application/json

{
  "features": {
    "CUSTOM_RADIUS_TARGETING": {
      "feature_type": "CUSTOM_RADIUS_TARGETING",
      "custom_radius": 30
    }
  }
}
```

**Призначення:** Приймає будь-яку підмножину функцій для оновлення.

**Особливості:**
- Можна змінити одну або кілька функцій за раз
- Відповідь ідентична GET (поточний стан після змін)
- Помилка, якщо програма не підтримує тип функції

### 3. DELETE - Вимкнути/скинути функції
```http
DELETE /api/program/{program_id}/features/v1
Content-Type: application/json

{
  "features": ["CUSTOM_RADIUS_TARGETING", "AD_GOAL"]
}
```

**Призначення:** Масове вимкнення/скидання функцій.

**Особливості:**
- Приймає масив назв типів функцій
- Відповідь як у GET, але з "disabled" значеннями (null/порожні)

## 🎯 Підтримувані типи функцій

### 1. AD_GOAL
**Опис:** Визначення основної цілі рекламної кампанії
```typescript
interface AdGoalFeature {
  feature_type: 'AD_GOAL';
  ad_goal: 'DEFAULT' | 'CALLS' | 'WEBSITE_CLICKS';
}
```
**Валідація:** Має бути одним з трьох значень

### 2. CALL_TRACKING  
**Опис:** Відстеження телефонних дзвінків з реклами
```typescript
interface CallTrackingFeature {
  feature_type: 'CALL_TRACKING';
  enabled: boolean;
  businesses: Array<{
    business_id: string;
    metered_phone_number: string | null;
  }>;
}
```
**Валідація:** metered_phone_number може бути null для вимкнення

### 3. CUSTOM_AD_TEXT
**Опис:** Власний текст або використання тексту з відгуків
```typescript
interface CustomAdTextFeature {
  feature_type: 'CUSTOM_AD_TEXT';
  custom_review_id?: string;
  custom_text?: string;
  // Тільки одне поле може бути встановлене!
}
```
**Валідація:** **Правило "one-of"** - лише одне з полів

### 4. CUSTOM_LOCATION_TARGETING
**Опис:** Конкретні локації для показу реклами
```typescript
interface CustomLocationTargetingFeature {
  feature_type: 'CUSTOM_LOCATION_TARGETING';
  businesses: Array<{
    business_id: string;
    locations: string[]; // до 25 локацій
  }>;
}
```
**Валідація:** Максимум 25 локацій на бізнес, тільки US

### 5. CUSTOM_RADIUS_TARGETING
**Опис:** Радіус показу реклами навколо бізнесу
```typescript
interface CustomRadiusTargetingFeature {
  feature_type: 'CUSTOM_RADIUS_TARGETING';
  custom_radius?: number | null; // 1-60 миль
}
```
**Валідація:** 1-60 миль або null для вимкнення

### 6. BUSINESS_LOGO
**Опис:** Логотип бренду для реклами
```typescript
interface BusinessLogoFeature {
  feature_type: 'BUSINESS_LOGO';
  business_logo_url?: string;
}
```
**Валідація:** Публічний URL, формати: jpeg/png/gif/tiff

### 7. VERIFIED_LICENSE
**Опис:** Перевірені ліцензії бізнесу
```typescript
interface VerifiedLicenseFeature {
  feature_type: 'VERIFIED_LICENSE';
  licenses: Array<{
    license_number: string;
    license_verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    license_expiry_date?: string; // YYYY-MM-DD
    license_trade?: string;
    license_issuing_agency?: string;
    license_verification_failure_reason?: string;
  }>;
}
```

### 8. Інші типи
- `LINK_TRACKING` - відстеження посилань (website, menu, url)
- `NEGATIVE_KEYWORD_TARGETING` - негативні ключові слова
- `STRICT_CATEGORY_TARGETING` - строге таргетування за категоріями  
- `AD_SCHEDULING` - розклад показу реклами
- `SERVICE_OFFERINGS_TARGETING` - таргетування за послугами (застарілий)
- `BUSINESS_HIGHLIGHTS` - підкреслення бізнесу
- `CUSTOM_AD_PHOTO` - власне фото реклами
- `YELP_PORTFOLIO` - портфоліо проектів

## 💻 Використання в коді

### Backend Service (Django)
```python
from ads.services import YelpService

# Отримати функції
features = YelpService.get_program_features(program_id)

# Оновити функції
update_payload = {
    "features": {
        "CUSTOM_RADIUS_TARGETING": {
            "feature_type": "CUSTOM_RADIUS_TARGETING",
            "custom_radius": 25
        }
    }
}
result = YelpService.update_program_features(program_id, update_payload)

# Видалити функції
features_to_delete = ["LINK_TRACKING", "AD_GOAL"]
result = YelpService.delete_program_features(program_id, features_to_delete)
```

### Frontend Hooks (React)
```typescript
import { 
  useGetProgramFeaturesQuery,
  useUpdateProgramFeaturesMutation,
  useDeleteProgramFeaturesMutation 
} from '../store/api/yelpApi';

// Отримати функції
const { data, isLoading, error } = useGetProgramFeaturesQuery(programId);

// Оновити функції
const [updateFeatures] = useUpdateProgramFeaturesMutation();
await updateFeatures({
  program_id: programId,
  features: { /* payload */ }
});

// Видалити функції
const [deleteFeatures] = useDeleteProgramFeaturesMutation();
await deleteFeatures({
  program_id: programId,  
  features: ["CUSTOM_RADIUS_TARGETING"]
});
```

### Валідація (TypeScript)
```typescript
import { validateFeature, ProgramFeatureType } from '../types/yelp';

const validation = validateFeature('CUSTOM_RADIUS_TARGETING', {
  custom_radius: 25
});

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

## ⚠️ Обмеження та вимоги

### Критичні правила валідації

1. **AD_GOAL** - завжди string-enum (не boolean)
2. **CUSTOM_AD_TEXT** - правило "one-of" (тільки одне поле)
3. **CUSTOM_LOCATION_TARGETING** - максимум 25 локацій на бізнес, тільки US
4. **CUSTOM_RADIUS_TARGETING** - тільки 1-60 миль або null
5. **BUSINESS_LOGO** - публічний URL з підтримуваними форматами
6. **VERIFIED_LICENSE** - license_verification_status обов'язковий

### Застарілі типи

⚠️ `SERVICE_OFFERINGS_TARGETING` вважається застарілим - використовуйте `NEGATIVE_KEYWORD_TARGETING` як альтернативу.

## 🔧 Налаштування середовища

### Змінні оточення (.env)
```bash
YELP_API_KEY=your_api_key
YELP_API_SECRET=your_api_secret
```

### Django URLs
```python
# backend/ads/urls.py
path('program/<str:program_id>/features/v1', ProgramFeaturesView.as_view()),
```

## 🧪 Тестування

### Backend тести
```python
def test_get_program_features():
    # Тест отримання функцій

def test_update_program_features():
    # Тест оновлення функцій

def test_delete_program_features():
    # Тест видалення функцій
    
def test_validation_errors():
    # Тест валідації та помилок
```

### Frontend тести
```typescript
describe('Program Features', () => {
  it('should fetch features', () => {
    // Тест useGetProgramFeaturesQuery
  });
  
  it('should update features', () => {
    // Тест useUpdateProgramFeaturesMutation
  });
  
  it('should validate feature data', () => {
    // Тест validateFeature функції
  });
});
```

## 📚 Посилання на офіційну документацію

- [📖 Retrieve Program Feature](https://docs.developer.yelp.com/reference/retrieve-program-feature) - опис відповіді та типів функцій
- [📝 Add Program Feature](https://docs.developer.yelp.com/reference/add-program-feature) - поведінка POST, "підмножина" функцій  
- [🗑️ Delete Program Feature](https://docs.developer.yelp.com/reference/delete-program-feature) - масове вимкнення функцій
- [🏗️ Program Feature API](https://docs.developer.yelp.com/docs/program-feature-api) - огляд розділу та суміжні ендпоінти

## 🎯 Очікування від модуля

✅ **Реалізовано:**
- Обгортки для трьох методів (GET/POST/DELETE)
- Маппінг помилок HTTP статусів
- Детальне логування запитів/відповідей (без секретів)
- TypeScript типи для всіх функцій
- Валідація згідно вимог Yelp API
- UI з детальними поясненнями

🔄 **Рекомендовано додати:**
- Ретраї для 429/5xx помилок
- Таймаути для запитів
- Юніт-тести успіху/помилок та лімітів
- Кешування відповідей
- Більше валідаційних правил

---

**Автор:** Senior Backend Engineer  
**Дата:** 2025-01-17  
**Версія API:** v1
