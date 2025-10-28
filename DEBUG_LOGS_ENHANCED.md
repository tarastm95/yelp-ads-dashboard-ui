# 🔍 Enhanced Debug Logs - Authentication Tracking

## Додані логи

### 1. Frontend API (`yelpApi.ts`)

**Логування в `prepareHeaders`:**
```typescript
console.log('🔐 [prepareHeaders] Auth state:', {
  hasUsername: !!auth.username,
  hasPassword: !!auth.password,
  username: auth.username ? `${auth.username.substring(0, 10)}...` : 'empty',
});

if (auth.username && auth.password) {
  console.log('✅ [prepareHeaders] Authorization header set');
} else {
  console.warn('⚠️ [prepareHeaders] No credentials! Skipping Authorization header');
}
```

### 2. ProgramsList Component

**Логування credentials state:**
```typescript
console.log('🔐 [ProgramsList] Credentials state:', {
  fromRedux: !!(reduxUsername && reduxPassword),
  fromStorage: !(reduxUsername && reduxPassword),
  hasUsername: !!username,
  hasPassword: !!password,
  username: username ? `${username.substring(0, 10)}...` : 'empty'
});
```

## Що шукати в логах

### Scenario 1: Credentials не завантажуються
```
🔐 [ProgramsList] Credentials state: {fromRedux: false, fromStorage: true, hasUsername: false}
⚠️ [prepareHeaders] No credentials! Skipping Authorization header
📊 [useProgramsSearch] First page response: {total_count: 0} ← ❌
```

### Scenario 2: Credentials є, але не відправляються
```
🔐 [ProgramsList] Credentials state: {fromRedux: true, hasUsername: true, hasPassword: true}
⚠️ [prepareHeaders] No credentials! ← ❌ Redux state не передається?
📊 [useProgramsSearch] First page response: {total_count: 0}
```

### Scenario 3: Все працює правильно
```
🔐 [ProgramsList] Credentials state: {fromRedux: true, hasUsername: true, hasPassword: true}
✅ [prepareHeaders] Authorization header set ← ✅
📊 [useProgramsSearch] First page response: {total_count: 435} ← ✅
```

## Інструкції для тестування

1. Відкрити Developer Console (F12)
2. Очистити консоль
3. Перезавантажити сторінку або запустити sync
4. Шукати логи:
   - `🔐 [ProgramsList] Credentials state` - показує credentials в компоненті
   - `🔐 [prepareHeaders] Auth state` - показує credentials перед API запитом
   - `✅ [prepareHeaders] Authorization header set` - підтверджує що header додано
   - `⚠️ [prepareHeaders] No credentials!` - WARNING якщо credentials відсутні

## Можливі проблеми та рішення

### Problem 1: `fromStorage: true` але `hasUsername: false`
**Cause:** localStorage пустий або corrupted  
**Fix:** Перелогінитись

### Problem 2: `hasUsername: true` в ProgramsList, але `No credentials!` в prepareHeaders
**Cause:** Redux state не синхронізований між компонентом та API middleware  
**Fix:** Перевірити Redux persist configuration

### Problem 3: `Authorization header set` але backend бачить `user: None`
**Cause:** Header не доходить до backend (proxy issue?)  
**Fix:** Перевірити nginx/proxy configuration

## Next Steps

Після збору цих логів ми зможемо точно визначити:
- ✅ Чи завантажуються credentials
- ✅ Чи передаються credentials до API middleware
- ✅ Чи додається Authorization header
- ✅ Чи отримує backend правильний header

**Ready to test!** 🚀

