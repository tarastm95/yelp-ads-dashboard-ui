# Program Type Filtering - Changes Summary

## Files Modified: 4

### 1. `backend/ads/sync_service.py`

**Changes:**
- Updated `get_business_ids_for_user()` method signature to accept `program_type` parameter
- Added filtering logic: `if program_type and program_type != 'ALL': query = query.filter(program_name=program_type)`
- Updated `get_program_ids_for_business()` method signature to accept `program_type` parameter
- Added same filtering logic for program_type

**Lines Modified:** ~15 lines

---

### 2. `backend/ads/views.py`

**Changes:**

#### ProgramListView.get():
- Added: `program_type = request.query_params.get('program_type', None)`
- Updated logging to include program_type
- Updated `get_program_ids_for_business()` call to pass `program_type=program_type`
- Added new filtering branch for program_type without business_id:
  ```python
  if program_type and program_type != 'ALL' and username:
      query = query.filter(program_name=program_type)
  ```

#### BusinessIdsView.get():
- Added: `program_type = request.query_params.get('program_type', None)`
- Updated logging to include program_type
- Updated `get_business_ids_for_user()` call to pass `program_type=program_type`
- Updated docstring

**Lines Modified:** ~70 lines

---

### 3. `frontend/src/store/api/yelpApi.ts`

**Changes:**

#### getPrograms query:
- Updated type signature to include `program_type?: string`
- Added `program_type` to query function parameters
- Added to params: `...(program_type ? { program_type } : {})`
- Updated `serializeQueryArgs` to include program_type in cache key

#### getBusinessIds query:
- Changed parameter type from `string | undefined` to `{ programStatus?: string; programType?: string } | undefined`
- Rewrote query function to use URLSearchParams for both parameters
- Updated providesTags to include program_type in cache key

**Lines Modified:** ~30 lines

---

### 4. `frontend/src/components/ProgramsList.tsx`

**Changes:**

#### State Management:
- Added: `const savedProgramType = sessionStorage.getItem('programsList_programType')`
- Added: `const [programType, setProgramType] = useState(savedProgramType || 'ALL')`
- Updated `useGetBusinessIdsQuery` call to pass object with `programStatus` and `programType`
- Updated useEffect to refetch on programType change
- Updated sessionStorage save useEffect to include programType
- Updated `useGetProgramsQuery` call to include `program_type` parameter

#### UI:
- Added new dropdown after Business dropdown:
  ```tsx
  <div>
    <label className="text-sm font-medium">Program Type:</label>
    <select value={programType} onChange={...}>
      <option value="ALL">ALL</option>
      <option value="BP">BP – Branded Profile</option>
      ... (10 program types)
    </select>
  </div>
  ```

**Lines Modified:** ~65 lines

---

## Total Lines Modified: ~180 lines

## API Changes:

### New Query Parameters:

1. **GET /api/reseller/programs**
   - Added: `?program_type=<TYPE>`
   - Example: `/api/reseller/programs?program_status=CURRENT&program_type=CPC`

2. **GET /api/reseller/business-ids**
   - Added: `?program_type=<TYPE>`
   - Example: `/api/reseller/business-ids?program_status=CURRENT&program_type=BP`

---

## Database Fields Used:

- `ProgramRegistry.program_name` - Contains program type (BP, CPC, EP, etc.)
- Filtering: `WHERE program_name = '<selected_type>'`

---

## No Breaking Changes:

All changes are backward compatible:
- `program_type` parameter is optional
- Default behavior (when not provided) remains unchanged
- Existing API calls continue to work without modification
