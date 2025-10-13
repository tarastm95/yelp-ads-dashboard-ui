# 🐛 Program Features API - Виправлення помилок

## ❌ Проблеми які були:

### 1. **400 Bad Request - "This field is required"**
**Причина:** Неправильна структура payload для Program Features API

### 2. **400 Bad Request - "The request does not comply with our specifications"**
**Причина:** Неправильний HTTP метод (POST замість PUT)

**Було відправлялося:**
```json
{
  "AD_GOAL": {
    "ad_goal": "CALLS"
  }
}
```

**Очікувалося на бекенді:**
```json
{
  "features": {
    "AD_GOAL": {
      "ad_goal": "CALLS"
    }
  }
}
```

### 3. **React Warning: Missing Description**
**Причина:** Dialog компонент без aria-describedby атрибуту

```
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}
```

## ✅ Виправлення:

### 🔧 1. Виправлено payload структуру

**`frontend/src/pages/ProgramFeatures.tsx`:**
```typescript
// ❌ Було:
const handleSaveFeature = async (featureType: FeatureType, featureData: any) => {
  await updateFeatures({
    program_id: programId!,
    features: {
      [featureType]: featureData  // ← Відсутній wrapper "features"
    }
  }).unwrap();
};

// ✅ Стало:
const handleSaveFeature = async (featureType: FeatureType, featureData: any) => {
  await updateFeatures({
    program_id: programId!,
    features: {
      features: {  // ← Додано wrapper "features"
        [featureType]: featureData
      }
    }
  }).unwrap();
};
```

### 🔧 2. Виправлено HTTP метод

**`backend/ads/services.py`:**
```python
# ❌ Було:
resp = requests.post(url, json=features_payload, auth=auth_creds, headers=headers)

# ✅ Стало:
resp = requests.put(url, json=features_payload, auth=auth_creds, headers=headers)
```

**Згідно з Yelp API специфікацією:**
- `GET /program/{id}/features/v1` - отримання features
- `PUT /program/{id}/features/v1` - оновлення features ✅
- `DELETE /program/{id}/features/v1` - видалення features

### 🔧 3. Виправлено Dialog accessibility

**`frontend/src/components/FeatureEditors/FeatureEditorManager.tsx`:**
```tsx
// ❌ Було:
<DialogContent className="max-w-fit max-h-[90vh] overflow-y-auto">

// ✅ Стало:
<DialogContent 
  className="max-w-fit max-h-[90vh] overflow-y-auto" 
  aria-describedby="feature-editor-description"
>
  <DialogHeader>
    <DialogTitle>
      Налаштування фічі: {featureType?.replace(/_/g, ' ')}
    </DialogTitle>
  </DialogHeader>
  <div id="feature-editor-description" className="sr-only">
    Графічний редактор для налаштування програмних функцій Yelp Ads
  </div>
```

## 📋 Технічні деталі:

### Backend Serializer Structure:
```python
# backend/ads/serializers.py
class ProgramFeaturesRequestSerializer(serializers.Serializer):
    features = serializers.JSONField()  # ← Очікує wrapper "features"
    
    def validate_features(self, value):
        # Валідація кожного feature_type
        for feature_type, feature_data in value.items():
            self._validate_feature_type(feature_type, feature_data)
```

### RTK Query API:
```typescript
// frontend/src/store/api/yelpApi.ts
updateProgramFeatures: builder.mutation<...>({
  query: ({ program_id, features }) => ({
    url: `/program/${program_id}/features/v1`,
    method: 'POST',
    body: features,  // ← body має містити {features: {...}}
  }),
})
```

### Feature Specific Serializers:
```python
# backend/ads/serializers.py
class AdGoalSerializer(serializers.Serializer):
    AD_GOAL_CHOICES = ['DEFAULT', 'CALLS', 'WEBSITE_CLICKS']
    ad_goal = serializers.ChoiceField(choices=AD_GOAL_CHOICES, required=True)
```

## 🎯 Результат:

Тепер AD_GOAL feature (і всі інші) працюють правильно:

1. **Вибираємо ціль:** DEFAULT/CALLS/WEBSITE_CLICKS
2. **Натискаємо "Зберегти ціль"**
3. **✅ Успішне збереження** без помилок 400
4. **🔄 Автоматичне оновлення** даних з сервера
5. **📱 Accessibility** - немає React warnings

## 🔍 Логування:

З детальним логуванням тепер видно:

```bash
🔧 Saving feature: AD_GOAL with data: {ad_goal: "CALLS"}
🌐 ProgramFeaturesView.POST: Incoming update request for program_id: UTBWLi2IL0dHbNK-vfTofA
📝 ProgramFeaturesView.POST: Raw request data: {'features': {'AD_GOAL': {'ad_goal': 'CALLS'}}}
🎯 ProgramFeaturesView.POST: Feature types being updated: ['AD_GOAL']
✅ ProgramFeaturesView.POST: Validation passed, proceeding with update
🔧 YelpService.update_program_features: Updating features for program
📄 YelpService.update_program_features: Exact JSON being sent: {
  "features": {
    "AD_GOAL": {
      "ad_goal": "CALLS"
    }
  }
}
✅ ProgramFeaturesView.POST: Successfully updated features
```

## 🚀 Тестування:

Перейдіть на: `http://localhost:8081/program-features/UTBWLi2IL0dHbNK-vfTofA`

1. Клікніть "Налаштувати фічу" для AD_GOAL
2. Оберіть будь-яку ціль (DEFAULT/CALLS/WEBSITE_CLICKS) 
3. Натисніть "Зберегти ціль"
4. ✅ Має працювати без помилок!

**Проблема повністю виправлена!** 🎉
