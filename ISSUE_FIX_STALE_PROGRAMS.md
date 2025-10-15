# Issue Fix: Programs Not Loading

## Problem Summary

The programs were not loading in the dashboard despite filters being applied correctly. The issue was traced to **stale program IDs in the database**.

### Root Cause

1. **Stale Database Records**: The local database (`ProgramRegistry`) contained program IDs that no longer exist in the Yelp Partner API.
2. **API Response**: When fetching program details, the Yelp API returned:
   ```json
   {
     "programs": [],
     "errors": [{
       "id": "INVALID_PROGRAM_ID",
       "description": "Supplied program ID does not exist."
     }]
   }
   ```
3. **Silent Failure**: The backend was silently skipping these invalid programs without logging or notifying the user.

### Example from Logs

```
2025-10-15 18:57:42,234 [INFO] Found 9 program_ids for business XgJnKYExjgqDDe_rM9dPpg
... (9 successful API calls) ...
2025-10-15 18:57:44,087 [INFO] ✅ Returning 0 programs for business
```

**Result**: Found 9 program IDs → Made 9 API calls → All returned errors → Displayed 0 programs

## Solution Implemented

### Backend Changes (`backend/ads/views.py`)

1. **Enhanced Logging**: Added detailed logging to track stale program IDs
   ```python
   if program_data and program_data.get('errors'):
       logger.warning(f"⚠️  Program {program_id} not found in Yelp API (stale data)")
       invalid_program_ids.append(program_id)
   ```

2. **Warning Response**: API now returns warning messages when stale programs are detected
   ```python
   response_data['warning'] = f'{len(invalid_program_ids)} programs in database no longer exist in Yelp API. Click "Sync Programs" to update.'
   response_data['stale_count'] = len(invalid_program_ids)
   ```

3. **Accurate Count**: `total_count` now reflects only valid programs, not stale database entries

### Frontend Changes

1. **Warning Banner** (`frontend/src/components/ProgramsList.tsx`):
   - Added yellow alert banner when `data.warning` is present
   - Shows number of stale programs
   - Includes a "Sync Now" button for easy resolution

2. **Type Definitions** (`frontend/src/store/api/yelpApi.ts`):
   - Updated API response type to include `warning?: string` and `stale_count?: number`

## How to Fix for User

### Immediate Action Required

**Click the "Sync Programs" button** at the top of the Advertising Programs page. This will:

1. Fetch all current programs from Yelp API
2. Update the local database with valid program IDs
3. Remove stale/expired program records
4. Show a progress indicator during sync

### Expected Behavior After Sync

- ✅ Valid programs will load correctly
- ✅ Filters will work as expected (status, business, program type)
- ✅ No more "No programs" message for existing programs
- ✅ Warning banner will disappear once all stale data is cleaned

## Technical Details

### Why Programs Become Stale

Programs can become stale when:
1. Programs are terminated/deleted via Yelp directly
2. Programs expire and are automatically removed by Yelp
3. Programs are migrated or merged in Yelp's system
4. Long time since last sync (recommended: sync weekly)

### Database vs API

- **Database (`ProgramRegistry`)**: Local cache for fast filtering and searching
- **Yelp API**: Source of truth for program data
- **Sync Process**: Keeps database in sync with API

### Architecture Flow

```
User Request
    ↓
Frontend (with filters)
    ↓
Backend API
    ↓
Database Query (filter by status/type)
    ↓
Get Program IDs
    ↓
Fetch Full Data from Yelp API (one by one)
    ↓
Return Valid Programs + Warning
```

## Files Modified

1. `/var/www/yelp-ads-dashboard-ui/backend/ads/views.py`
   - Lines 601-641: Business ID filtering
   - Lines 667-712: Program type filtering

2. `/var/www/yelp-ads-dashboard-ui/frontend/src/components/ProgramsList.tsx`
   - Lines 855-885: Warning banner component

3. `/var/www/yelp-ads-dashboard-ui/frontend/src/store/api/yelpApi.ts`
   - Line 190: Updated type definition

## Testing

After deployment:
1. ✅ Backend logs show stale programs being detected
2. ✅ Frontend displays warning banner
3. ✅ "Sync Now" button triggers sync
4. ✅ Programs load after sync completes

## Future Improvements

1. **Auto-sync on Startup**: Automatically sync on first load if database is older than X days
2. **Batch API Calls**: Use Yelp's batch endpoint instead of individual calls
3. **Soft Delete**: Mark programs as "deleted" instead of returning 0 results
4. **Cache Invalidation**: Set TTL on database records

## Status

- ✅ **Fixed and Deployed**: Changes are live in production
- ✅ **Backend restarted**: Container restarted at 19:03:07
- ✅ **Frontend reloaded**: HMR updated at 19:02:16

---

**Action Required**: Please click "Sync Programs" to refresh your database and see your programs!

