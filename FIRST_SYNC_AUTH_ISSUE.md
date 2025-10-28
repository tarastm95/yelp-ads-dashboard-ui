# 🔐 First Sync Authentication Issue - ROOT CAUSE FOUND!

## 🎯 Проблема Знайдена!

Після першої синхронізації програми НЕ відображаються, бо **frontend не відправляє Authorization header**!

### Backend Logs:
```
🔐 Authorization header present: False ← ❌
user: None ← ❌
⚠️  No programs found ← query з username=None = 0 results!
```

### Database Reality:
```
Total programs: 2671 ✅
With status CURRENT: 435 ✅
```

### Backend Query:
```python
# НЕПРАВИЛЬНО (username=None):
query = ProgramRegistry.objects.filter(username=None, status='CURRENT')
# Result: 0 rows ❌

# ПРАВИЛЬНО:
query = ProgramRegistry.objects.filter(username='digitizeit_demarketing_ads', status='CURRENT')  
# Result: 435 rows ✅
```

## Root Cause

**Frontend не відправляє credentials при першому запиті після sync!**

Redux state з credentials не завантажується достатньо швидко.

## Solution

Потрібно переконатись що Redux persist завантажив credentials **ДО** того як робити API запит після sync.

Файл: `frontend/src/components/ProgramsList.tsx`

**Проблемний код (рядки 420-431):**
```typescript
setTimeout(() => {
  refreshPrograms();  // ← Робить запит БЕЗ credentials!
  void ensureStatus(programStatus, { force: true });
}, 500);
```

**Fix:** Перевірити credentials перед запитом!

