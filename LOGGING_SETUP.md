# 📋 Детальне логування для Program Features API

## ✅ Що реалізовано:

Додано **максимально детальне логування** для діагностики Program Features API на сторінці:
`http://localhost:8081/program-features/UTBWLi2IL0dHbNK-vfTofA`

### 🔍 Рівні логування:

**1. 🌐 Middleware логування (ads.requests):**
- Час запиту та відповіді
- HTTP метод, URL, статус код
- Тривалість обробки запиту
- Спеціальне логування для `/program/*/features/*` endpoints

**2. 🎯 Views логування (ads.views):**
- Детальна інформація про вхідні запити
- Headers, IP адреса, User-Agent
- Валідація payload
- Типи feature які оновлюються/видаляються
- Повний traceback при помилках

**3. 🔧 Service логування (ads.services):**
- Детальні HTTP запити до Yelp API
- Request/Response headers та body
- Автентифікація (замаскований пароль)
- JSON payload форматування
- Результати API викликів

### 📊 Приклад логів:

**При відкритті сторінки Program Features:**
```bash
🔵 REQUEST: GET /api/program/UTBWLi2IL0dHbNK-vfTofA/features/v1
🎯 PROGRAM_FEATURES_REQUEST: GET /api/program/UTBWLi2IL0dHbNK-vfTofA/features/v1
🎯 PROGRAM_FEATURES_REQUEST: Headers: {'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0...'}
🌐 ProgramFeaturesView.GET: Incoming request for program_id: UTBWLi2IL0dHbNK-vfTofA
🌐 ProgramFeaturesView.GET: Request method: GET
🌐 ProgramFeaturesView.GET: Request IP: 127.0.0.1
🔄 ProgramFeaturesView.GET: Calling YelpService.get_program_features for UTBWLi2IL0dHbNK-vfTofA
🔍 YelpService.get_program_features: Getting features for program 'UTBWLi2IL0dHbNK-vfTofA'
🌐 YelpService.get_program_features: Request URL: https://partner-api.yelp.com/program/UTBWLi2IL0dHbNK-vfTofA/features/v1
🔐 YelpService.get_program_features: Using auth credentials - username: 'KTqX***', password: 'obKN***'
📤 YelpService.get_program_features: Making GET request to Yelp API...
📥 YelpService.get_program_features: Response status code: 200
📥 YelpService.get_program_features: Response headers: {'Content-Type': 'application/json', 'Content-Length': '1234'}
📥 YelpService.get_program_features: Raw response text: {"features": {...}}
✅ YelpService.get_program_features: Successfully parsed JSON response
📊 YelpService.get_program_features: Program UTBWLi2IL0dHbNK-vfTofA features: ['AD_GOAL', 'CUSTOM_AD_TEXT', ...]
✅ ProgramFeaturesView.GET: Successfully retrieved features for program_id: UTBWLi2IL0dHbNK-vfTofA
🎯 ProgramFeaturesView.GET: Available features: ['AD_GOAL', 'CUSTOM_AD_TEXT', 'CUSTOM_AD_PHOTO', 'AD_SCHEDULING']
🔴 RESPONSE: GET /api/program/UTBWLi2IL0dHbNK-vfTofA/features/v1 -> 200 (0.456s)
🎯 PROGRAM_FEATURES_RESPONSE: Status 200 for GET /api/program/UTBWLi2IL0dHbNK-vfTofA/features/v1
```

**При оновленні feature:**
```bash
🔵 REQUEST: POST /api/program/UTBWLi2IL0dHbNK-vfTofA/features/v1
🎯 PROGRAM_FEATURES_REQUEST: POST /api/program/UTBWLi2IL0dHbNK-vfTofA/features/v1
🎯 PROGRAM_FEATURES_REQUEST: Body: {"features": {"AD_GOAL": {"ad_goal": "CALLS"}}}
🌐 ProgramFeaturesView.POST: Incoming update request for program_id: UTBWLi2IL0dHbNK-vfTofA
📝 ProgramFeaturesView.POST: Raw request data: {'features': {'AD_GOAL': {'ad_goal': 'CALLS'}}}
🎯 ProgramFeaturesView.POST: Feature types being updated: ['AD_GOAL']
🔍 ProgramFeaturesView.POST: Validating request payload with ProgramFeaturesRequestSerializer
✅ ProgramFeaturesView.POST: Validation passed, proceeding with update
🔄 ProgramFeaturesView.POST: Calling YelpService.update_program_features for UTBWLi2IL0dHbNK-vfTofA
🔧 YelpService.update_program_features: Updating features for program 'UTBWLi2IL0dHbNK-vfTofA'
📝 YelpService.update_program_features: Payload: {'features': {'AD_GOAL': {'ad_goal': 'CALLS'}}}
📄 YelpService.update_program_features: Exact JSON being sent: {
  "features": {
    "AD_GOAL": {
      "ad_goal": "CALLS"
    }
  }
}
📤 YelpService.update_program_features: Making POST request to Yelp API...
📥 YelpService.update_program_features: Response status code: 200
✅ YelpService.update_program_features: Successfully updated features
✅ ProgramFeaturesView.POST: Successfully updated features for program_id: UTBWLi2IL0dHbNK-vfTofA
🔴 RESPONSE: POST /api/program/UTBWLi2IL0dHbNK-vfTofA/features/v1 -> 200 (0.723s)
```

**При помилці:**
```bash
❌ YelpService.get_program_features: HTTP Error for UTBWLi2IL0dHbNK-vfTofA: 404 Client Error
❌ YelpService.get_program_features: Response status: 404
❌ YelpService.get_program_features: Response text: {"error": "Program not found"}
❌ ProgramFeaturesView.GET: Unexpected error for program_id UTBWLi2IL0dHbNK-vfTofA: 404 Client Error
❌ ProgramFeaturesView.GET: Exception type: HTTPError
❌ ProgramFeaturesView.GET: Full traceback: Traceback (most recent call last): ...
```

### 🔧 Налаштування:

**`backend/backend/settings.py`:**
```python
LOGGING = {
    'loggers': {
        'ads.views': {
            'level': 'INFO',  # Завжди INFO для views
        },
        'ads.services': {
            'level': 'INFO',  # Завжди INFO для services
        },
        'ads.requests': {
            'level': 'INFO',  # Middleware логування
        },
    }
}
```

**Компоненти логування:**
- `ads.middleware.RequestLoggingMiddleware` - всі HTTP запити
- `ads.views.ProgramFeaturesView` - GET/POST/DELETE методи
- `ads.services.YelpService` - взаємодія з Yelp API

### 🎯 Використання:

1. **Запустіть Django:**
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Відкрийте Program Features:**
   ```
   http://localhost:8081/program-features/UTBWLi2IL0dHbNK-vfTofA
   ```

3. **Дивіться логи в консолі Django** - ви побачите детальну інформацію про:
   - Які запити надходять з фронтенда
   - Як вони обробляються в Django
   - Які запити йдуть до Yelp API
   - Що повертає Yelp API
   - Які помилки виникають

### 📋 Логи допоможуть діагностувати:

- ❌ **API помилки** - статус коди, повідомлення від Yelp
- 🔍 **Проблеми валідації** - неправильний payload
- 🌐 **Мережеві проблеми** - timeout, недоступність API
- 🔐 **Проблеми автентифікації** - неправильні креденшали
- 📝 **Неправильні дані** - некоректний JSON формат
- ⏱️ **Продуктивність** - тривалість запитів

### 🎉 Результат:

**Тепер ви маєте повну видимість того, що відбувається з Program Features API!**

Кожен клік, кожен запит, кожна відповідь - все логується з детальною інформацією. 
Якщо щось не працює, ви одразу побачите де саме проблема. 🔍✨
