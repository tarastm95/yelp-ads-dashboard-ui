# 🔍 Frontend Debug Logs - Business Names Issue

## Додано детальні логи для діагностики проблеми

### Проблема
Після **першої синхронізації** (пуста БД) програми не відображаються на фронтенді, хоча backend успішно зберігає дані.

### Додані логи

#### 1. `useProgramsSearch` Hook (`frontend/src/hooks/useProgramsSearch.ts`)

**Логи завантаження даних:**
```javascript
console.log(`🔍 [useProgramsSearch] ensureStatus called for status: "${statusKey}"`, {
  force: options.force,
  hasCached: !!cached,
  cacheAge: cached ? now - cached.fetchedAt : 'N/A',
  cacheTTL: CACHE_TTL_MS
});
```

**Логи стратегії завантаження:**
```javascript
console.log(`📋 [useProgramsSearch] Strategy decision:`, {
  totalCount,
  threshold: FAST_LOAD_THRESHOLD,
  shouldUseFastLoad
});
```

**Логи fast loading:**
```javascript
console.log(`⚡ [useProgramsSearch] Fast loading ${totalCount} programs in ONE request...`);
console.log(`⚡ [useProgramsSearch] Fast response:`, {
  programsLength: fastResponse?.programs?.length,
  total_count: fastResponse?.total_count,
  from_db: (fastResponse as any)?.from_db,
  loaded_all: (fastResponse as any)?.loaded_all
});
```

**Логи paginated loading:**
```javascript
console.log(`📄 [useProgramsSearch] Paginated loading ${totalCount} programs...`);
console.log(`📄 [useProgramsSearch] Page response:`, {
  offset,
  pageProgramsLength: pagePrograms.length,
  aggregatedLength: aggregated.length,
  totalCount
});
```

#### 2. `ProgramsList` Component (`frontend/src/components/ProgramsList.tsx`)

**Логи стану компонента:**
```javascript
console.log('📊 [ProgramsList] State update:', {
  programStatus,
  tempProgramStatus,
  allProgramsCount: allPrograms.length,
  cachedProgramsCount: cachedPrograms.length,
  totalFiltered,
  totalBusinessOptions: businessOptions.length,
  isLoading,
  isFetching,
  error: !!error,
  cacheVersion
});
```

**Логи даних програм:**
```javascript
console.log('📊 [ProgramsList] Programs data:', {
  allPrograms: allPrograms.slice(0, 3).map(p => ({
    program_id: p.program_id,
    yelp_business_id: p.yelp_business_id,
    business_name: p.business_name,
    custom_name: p.custom_name
  })),
  totalCount: allPrograms.length
});
```

**Логи фільтрації:**
```javascript
console.log('🔍 [ProgramsList] Filtering programs:', {
  allProgramsCount: allPrograms.length,
  filters: { programStatus, programType, businessId: selectedBusinessId }
});

console.log('🔍 [ProgramsList] Filter result:', {
  filteredCount: filtered.length,
  sample: filtered.slice(0, 3).map(p => ({
    program_id: p.program_id,
    program_status: p.program_status,
    program_type: p.program_type,
    yelp_business_id: p.yelp_business_id
  }))
});
```

**Логи синхронізації:**
```javascript
console.log(`🔄 [SSE] ${isAutomatic ? 'Automatic' : 'Manual'} sync triggered`);
console.log(`🔄 [SSE] Current state before sync:`, {
  allProgramsCount: allPrograms.length,
  programStatus,
  isLoading,
  isFetching
});
```

**Логи після завершення синхронізації:**
```javascript
console.log(`🔄 [SSE] Sync ${eventData.type}:`, eventData);
console.log(`🔄 [SSE] Refreshing data after sync...`);
console.log(`🔄 [SSE] Before refresh:`, {
  allProgramsCount: allPrograms.length,
  programStatus,
  tempProgramStatus
});
```

**Логи після оновлення даних:**
```javascript
console.log(`📊 [ProgramsList] After sync completion:`, {
  allProgramsCount: allPrograms.length,
  cachedProgramsCount: cachedPrograms.length,
  filteredCount: filteredPrograms.length,
  paginatedCount: paginatedPrograms.length,
  businessOptionsCount: businessOptions.length,
  programStatus,
  tempProgramStatus
});
```

### Як використовувати логи

#### 1. Відкрити Developer Tools
- Натиснути `F12` в браузері
- Перейти на вкладку `Console`

#### 2. Очистити консоль
- Натиснути `Clear console` (🚫) або `Ctrl+L`

#### 3. Запустити синхронізацію
- Оновити сторінку або натиснути "Sync Programs"
- Спостерігати за логами в реальному часі

#### 4. Ключові логи для аналізу

**Перевірити завантаження даних:**
```
🔍 [useProgramsSearch] ensureStatus called for status: "CURRENT"
📡 [useProgramsSearch] Fetching first page for "CURRENT"...
📊 [useProgramsSearch] First page response: { total_count: 2671, programsLength: 100 }
```

**Перевірити стратегію завантаження:**
```
📋 [useProgramsSearch] Strategy decision: { totalCount: 2671, shouldUseFastLoad: true }
⚡ [useProgramsSearch] Fast loading 2671 programs in ONE request...
```

**Перевірити відповідь API:**
```
⚡ [useProgramsSearch] Fast response: { programsLength: 2671, total_count: 2671, from_db: true }
💾 [useProgramsSearch] Caching fast load result: { programsCount: 2671, totalCount: 2671 }
```

**Перевірити стан компонента:**
```
📊 [ProgramsList] State update: { allProgramsCount: 2671, totalFiltered: 0, businessOptionsCount: 0 }
```

**Перевірити фільтрацію:**
```
🔍 [ProgramsList] Filtering programs: { allProgramsCount: 2671, filters: { programStatus: "CURRENT" } }
🔍 [ProgramsList] Filter result: { filteredCount: 0, sample: [] }
```

### Можливі проблеми

#### 1. Програми завантажуються, але не фільтруються
**Логи:**
```
📊 [ProgramsList] Programs data: { allPrograms: [{ program_status: "INACTIVE" }], totalCount: 2671 }
🔍 [ProgramsList] Filter result: { filteredCount: 0, sample: [] }
```
**Причина:** Всі програми мають статус "INACTIVE", а фільтр шукає "CURRENT"

#### 2. Business names не завантажуються
**Логи:**
```
📊 [ProgramsList] Programs data: { allPrograms: [{ business_name: "Lo6ye25DRwOJZ1QiXBg3Vw" }] }
```
**Причина:** `business_name` містить business_id замість реальної назви

#### 3. API повертає пустий результат
**Логи:**
```
📊 [useProgramsSearch] First page response: { total_count: 0, programsLength: 0 }
```
**Причина:** Backend не повертає програми (проблема з БД або API)

#### 4. Кеш не оновлюється
**Логи:**
```
✅ [useProgramsSearch] Using cached data for "CURRENT": { programsCount: 0, totalCount: 0 }
```
**Причина:** Використовується старий кеш, потрібно `force: true`

### Діагностичні кроки

1. **Перевірити backend логи** - чи зберігаються програми
2. **Перевірити API відповідь** - чи повертає backend програми
3. **Перевірити фільтрацію** - чи правильний статус програм
4. **Перевірити business names** - чи завантажуються назви
5. **Перевірити кеш** - чи оновлюється після sync

### Приклад успішних логів

```
🚀 [AUTO-SYNC] Component mounted, starting automatic sync...
🔄 [SSE] Automatic sync triggered
📊 [SSE] Event received: { type: "complete", status: "synced", added: 2671 }
🔄 [SSE] Sync complete: { type: "complete", status: "synced", added: 2671 }
🔄 [SSE] Refreshing data after sync...
🔍 [useProgramsSearch] ensureStatus called for status: "CURRENT" { force: true }
📡 [useProgramsSearch] Fetching first page for "CURRENT"...
📊 [useProgramsSearch] First page response: { total_count: 2671, programsLength: 100 }
⚡ [useProgramsSearch] Fast loading 2671 programs in ONE request...
⚡ [useProgramsSearch] Fast response: { programsLength: 2671, total_count: 2671 }
💾 [useProgramsSearch] Caching fast load result: { programsCount: 2671, totalCount: 2671 }
📊 [ProgramsList] State update: { allProgramsCount: 2671, totalFiltered: 2671 }
🔍 [ProgramsList] Filter result: { filteredCount: 2671 }
📊 [ProgramsList] After sync completion: { allProgramsCount: 2671, filteredCount: 2671 }
```

### Наступні кроки

1. **Запустити синхронізацію** і зібрати логи
2. **Проаналізувати** які кроки не працюють
3. **Виправити** знайдені проблеми
4. **Повторити** тестування

**Готово до діагностики!** 🔍
