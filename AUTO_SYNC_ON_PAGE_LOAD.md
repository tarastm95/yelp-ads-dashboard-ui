# Auto-Sync on Page Load

## Overview
When users visit the `/programs` page, the system automatically synchronizes program data with the Yelp Partner API and displays a multi-stage loading experience.

---

## 🔄 How It Works

### Automatic Trigger
The auto-sync is triggered when:
- ✅ User navigates to `/programs` page
- ✅ User is authenticated
- ✅ Component mounts for the first time

### Loading Phases

#### **Phase 1: Syncing** 🔄
```
⏳ Syncing programs... X/Y
```
- Connects to Yelp Partner API
- Synchronizes program data
- Shows real-time progress:
  - Percentage completed
  - Number of programs synced (X/Y)
  - Number of new programs added
  - Progress bar

#### **Phase 2: Loading** 📥
```
⏳ Loading Programs...
```
- Fetches program details from database
- Applies default filters (CURRENT status, ALL businesses, ALL types)
- Prepares data for display

#### **Phase 3: Display** ✅
```
Programs displayed in cards
```
- Shows filtered results
- Displays 10 programs per page
- Pagination controls available

---

## 💡 User Experience

### First Visit
1. User opens http://72.60.66.164:8080/programs
2. **Sees**: Spinner with "Syncing programs... 0/1906"
3. **Watches**: Progress bar filling up (0% → 100%)
4. **Sees**: Message changes to "Loading Programs..."
5. **Result**: Programs appear on the page

### Subsequent Visits
Same experience ensures fresh data on every page load.

---

## 🔧 Technical Implementation

### Code Location
**File**: `frontend/src/components/ProgramsList.tsx`

### Auto-Sync Hook
```typescript
// Auto-sync on component mount with loading phases
useEffect(() => {
  const performAutoSync = async () => {
    if (isAuthenticated) {
      console.log('🚀 [AUTO-SYNC] Component mounted, starting automatic sync...');
      
      // Phase 1: Syncing
      setLoadingPhase('syncing');
      
      // Perform sync
      await handleSyncWithSSE(true);
      
      // Phase 2: Loading programs
      setLoadingPhase('loading');
      
      // Trigger data refresh
      setForceRefreshKey(prev => prev + 1);
      
      // loadingPhase will be reset to 'idle' automatically by the existing useEffect
      // when isLoading and isFetching become false
    }
  };
  
  performAutoSync();
}, []); // Run only once on mount
```

### State Management
```typescript
// Loading phase state
const [loadingPhase, setLoadingPhase] = useState<'idle' | 'syncing' | 'loading'>('idle');

// Force refresh key to trigger RTK Query refetch
const [forceRefreshKey, setForceRefreshKey] = useState(0);
```

### Loading Phase Reset
```typescript
useEffect(() => {
  if (!isLoading && !isFetching) {
    setIsChangingPage(false);
    setIsChangingBusiness(false);
    // Reset loading phase when data is ready
    if (loadingPhase === 'loading') {
      setLoadingPhase('idle');
    }
  }
}, [isLoading, isFetching, loadingPhase]);
```

---

## 🎨 Visual Indicators

### Syncing Phase
```jsx
<div className="flex flex-col items-center justify-center py-12 space-y-4">
  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
  <div className="text-center space-y-2">
    <h3 className="text-lg font-medium text-gray-900">
      ⏳ Syncing programs... 1826/1906
    </h3>
    <p className="text-sm text-gray-600">
      Fetching programs from API... (45/47 batches)
    </p>
    <div className="w-64 mx-auto">
      <Progress value={95} className="h-2" />
    </div>
    <div className="text-xs text-gray-500">
      <p>95% • 0 new programs</p>
    </div>
  </div>
</div>
```

### Loading Phase
```jsx
<div className="flex flex-col items-center justify-center py-12 space-y-4">
  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
  <div className="text-center space-y-2">
    <h3 className="text-lg font-medium text-gray-900">
      Loading programs...
    </h3>
    <p className="text-sm text-gray-500 mt-1">
      Fetching program details...
    </p>
  </div>
</div>
```

---

## 🔗 Relationship with Search

### Auto-Sync (Page Load)
- **Trigger**: Automatic on page mount
- **Silent**: true (no separate sync progress card)
- **Purpose**: Ensure fresh data

### Manual Search
- **Trigger**: User clicks "Search Programs" button
- **Silent**: true (inline progress in main loader)
- **Purpose**: Sync + apply filters

### Both Use Same Flow
1. Set `loadingPhase = 'syncing'`
2. Call `handleSyncWithSSE(true)` with `silent: true`
3. Set `loadingPhase = 'loading'`
4. Trigger data refresh with `setForceRefreshKey()`
5. Wait for data to load
6. Automatic reset to `loadingPhase = 'idle'`

---

## ⚡ Performance Considerations

### Optimization
- **SSE (Server-Sent Events)**: Real-time progress updates without polling
- **Silent Mode**: No separate sync progress card during auto-sync
- **Inline Progress**: Shows progress directly in the main loader
- **Single Request**: Sync happens once per page load

### Caching
- Backend uses Redis for program data caching
- Sync only updates database if there are new/changed programs
- "Already up to date" response if no changes detected

---

## 🐛 Debugging

### Console Logs
```javascript
console.log('🚀 [AUTO-SYNC] Component mounted, starting automatic sync...');
console.log('🔄 [SYNC] Starting sync with SSE (silent mode)...');
console.log('📊 [SSE] Received event: progress', { synced, total, percentage });
console.log('✅ [SYNC] Sync completed successfully');
```

### Chrome DevTools
1. Open Network tab
2. Look for `/api/reseller/sync-programs-sse` request
3. Should see "EventStream" type
4. Check Response tab for SSE events

---

## 🚨 Error Handling

### If Sync Fails
```javascript
if (syncResult?.type === 'error') {
  // Still proceed to load programs from database
  setLoadingPhase('loading');
  setForceRefreshKey(prev => prev + 1);
}
```

### If Not Authenticated
```javascript
if (!isAuthenticated) {
  // Skip auto-sync
  // Show "Login to Sync" button
}
```

---

## ✅ Benefits

1. **Always Fresh Data**: Every page load syncs with Yelp API
2. **Visual Feedback**: Users see what's happening
3. **Consistent UX**: Same experience as manual search
4. **Transparent**: Shows progress in real-time
5. **Error Recovery**: Continues even if sync fails

---

## 📝 Maintenance Notes

### To Disable Auto-Sync
Comment out the useEffect:
```typescript
// useEffect(() => {
//   const performAutoSync = async () => { ... }
//   performAutoSync();
// }, []);
```

### To Adjust Timing
No timing adjustments needed - triggers immediately on mount.

### To Add Additional Filters
Auto-sync uses default filters. To change:
```typescript
// Before triggering refresh
setProgramStatus('CURRENT');
setProgramType('ALL');
setSelectedBusinessId('all');
```

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Feature**: Auto-sync with multi-stage loading on page load

