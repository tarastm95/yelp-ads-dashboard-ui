# 🎯 Program Type Filtering - Implementation

**Date:** October 15, 2025  
**Status:** ✅ Implemented and Ready for Testing

---

## 📋 Overview

Added the ability to filter advertising programs by **Program Type** in addition to existing Status and Business filters.

### Supported Program Types:
| Code | Name | Description |
|------|------|-------------|
| **BP** | Branded Profile | Enhanced business profile with branding customization |
| **EP** | Enhanced Profile | Improved profile with additional features (no competitor ads, CTA, etc.) |
| **CPC** | Cost Per Click ads | Pay-per-click advertising campaigns |
| **RCA** | Remove Competitor Ads | Removes competitor advertisements from your business page |
| **CTA** | Call To Action | Adds action buttons (e.g., call button at top of page) |
| **SLIDESHOW** | Slideshow | Image slideshow display on business page |
| **BH** | Business Highlights | Highlights key business aspects and features |
| **VL** | Verified License | Marks business as licensed (verified license badge) |
| **LOGO** | Logo Feature | Adds business logo to advertising blocks |
| **PORTFOLIO** | Portfolio Feature | Gallery showcasing work examples or services |

---

## ✅ What Was Implemented:

### 1️⃣ Backend - `sync_service.py`
**File:** `backend/ads/sync_service.py`

Updated two methods to support `program_type` filtering:

#### `get_business_ids_for_user()`
```python
@classmethod
def get_business_ids_for_user(cls, username: str, status: str = None, program_type: str = None) -> List[Dict]:
    """
    Returns unique business_ids with program counts.
    Supports filtering by status AND program_type.
    """
    # Filters by program_name field in ProgramRegistry
    if program_type and program_type != 'ALL':
        query = query.filter(program_name=program_type)
```

#### `get_program_ids_for_business()`
```python
@classmethod
def get_program_ids_for_business(
    cls, username: str, business_id: str, 
    status: str = None, program_type: str = None
) -> List[str]:
    """
    Returns program_ids for a specific business.
    Supports filtering by status AND program_type.
    """
```

---

### 2️⃣ Backend - `views.py`
**File:** `backend/ads/views.py`

#### `ProgramListView`
- Accepts `program_type` query parameter
- Filters programs by type when provided
- Works with both business_id filtering and standalone

```python
program_type = request.query_params.get('program_type', None)

# Filtering by business_id + program_type
program_ids = ProgramSyncService.get_program_ids_for_business(
    username, business_id, 
    status=program_status,
    program_type=program_type
)

# Filtering by program_type only
if program_type and program_type != 'ALL':
    query = query.filter(program_name=program_type)
```

#### `BusinessIdsView`
- Accepts `program_type` query parameter
- Returns only businesses that have programs of the specified type

```python
program_type = request.query_params.get('program_type', None)

businesses = ProgramSyncService.get_business_ids_for_user(
    username, 
    status=program_status,
    program_type=program_type
)
```

---

### 3️⃣ Frontend - `yelpApi.ts`
**File:** `frontend/src/store/api/yelpApi.ts`

#### `getPrograms` Query
```typescript
getPrograms: builder.query<..., { 
  offset?: number; 
  limit?: number; 
  program_status?: string; 
  business_id?: string; 
  program_type?: string;  // ✨ NEW
  _forceKey?: number 
}>({
  query: ({ ..., program_type, ... }) => ({
    params: { 
      ...,
      ...(program_type ? { program_type } : {}),
    },
  }),
  serializeQueryArgs: ({ endpointName, queryArgs }) => {
    return `${endpointName}_..._${queryArgs.program_type || 'all'}_...`;
  },
})
```

#### `getBusinessIds` Query
```typescript
getBusinessIds: builder.query<..., { 
  programStatus?: string; 
  programType?: string  // ✨ NEW
} | undefined>({
  query: (args) => {
    const params = new URLSearchParams();
    if (args?.programStatus) {
      params.append('program_status', args.programStatus);
    }
    if (args?.programType) {
      params.append('program_type', args.programType);
    }
    return `/reseller/business-ids${queryString ? `?${queryString}` : ''}`;
  },
})
```

---

### 4️⃣ Frontend - `ProgramsList.tsx`
**File:** `frontend/src/components/ProgramsList.tsx`

#### State Management
```typescript
const [programType, setProgramType] = useState(savedProgramType || 'ALL');

// Fetch business IDs with both filters
const { data: businessIdsData, refetch: refetchBusinessIds } = useGetBusinessIdsQuery({ 
  programStatus, 
  programType: programType !== 'ALL' ? programType : undefined 
});

// Fetch programs with program_type filter
const { data, isLoading, error, isError, refetch } = useGetProgramsQuery({
  offset, 
  limit,
  program_status: programStatus,
  business_id: selectedBusinessId !== 'all' ? selectedBusinessId : undefined,
  program_type: programType !== 'ALL' ? programType : undefined,
  _forceKey: forceRefreshKey
});
```

#### UI - Program Type Dropdown
```tsx
<div>
  <label className="text-sm font-medium">Program Type:</label>
  <select 
    value={programType} 
    onChange={async (e) => {
      setIsChangingPage(true);
      setProgramType(e.target.value);
      setOffset(0); // Reset to first page
      await handleSyncWithSSE(true);
      setForceRefreshKey(prev => prev + 1);
    }}
    className="ml-2 border rounded px-2 py-1"
  >
    <option value="ALL">ALL</option>
    <option value="BP">BP – Branded Profile</option>
    <option value="EP">EP – Enhanced Profile</option>
    <option value="CPC">CPC – Cost Per Click ads</option>
    <option value="RCA">RCA – Remove Competitor Ads</option>
    <option value="CTA">CTA – Call To Action</option>
    <option value="SLIDESHOW">SLIDESHOW – Slideshow</option>
    <option value="BH">BH – Business Highlights</option>
    <option value="VL">VL – Verified License</option>
    <option value="LOGO">LOGO – Logo Feature</option>
    <option value="PORTFOLIO">PORTFOLIO – Portfolio Feature</option>
  </select>
</div>
```

#### SessionStorage Persistence
```typescript
// Save filter state
useEffect(() => {
  sessionStorage.setItem('programsList_programType', programType);
}, [programType]);

// Restore on page load
const savedProgramType = sessionStorage.getItem('programsList_programType');
```

---

## 🎯 How It Works:

### Filter Combinations:

1. **Status + Program Type**
   ```
   Status: CURRENT + Program Type: CPC
   → Shows only current CPC programs
   ```

2. **Status + Business + Program Type**
   ```
   Status: CURRENT + Business: ABC123 + Program Type: BP
   → Shows only current BP programs for business ABC123
   ```

3. **Program Type Only**
   ```
   Program Type: PORTFOLIO
   → Shows all PORTFOLIO programs regardless of status
   ```

### Data Flow:

```
User selects Program Type
    ↓
Frontend updates state (programType)
    ↓
API calls include program_type parameter
    ↓
Backend filters by program_name in ProgramRegistry
    ↓
Returns filtered programs
    ↓
UI displays filtered results
    ↓
Business dropdown updates to show only businesses with that program type
```

---

## 🔍 Database Field Mapping:

The filtering uses the `program_name` field in the `ProgramRegistry` model:

```python
class ProgramRegistry(models.Model):
    program_id = models.CharField(max_length=255, unique=True)
    program_name = models.CharField(max_length=100)  # ← Stores: BP, CPC, EP, etc.
    yelp_business_id = models.CharField(max_length=255)
    status = models.CharField(max_length=20)  # CURRENT, PAST, FUTURE, etc.
```

---

## 📊 API Endpoints:

### Get Programs with Program Type Filter
```http
GET /api/reseller/programs?program_status=CURRENT&program_type=CPC&offset=0&limit=20
```

### Get Business IDs with Program Type Filter
```http
GET /api/reseller/business-ids?program_status=CURRENT&program_type=BP
```

---

## ✨ Features:

1. ✅ **Dropdown Filter** - Easy selection of program types
2. ✅ **Combined Filtering** - Works with Status and Business filters
3. ✅ **Persistent State** - Remembers selection in sessionStorage
4. ✅ **Dynamic Business List** - Business dropdown updates based on program type
5. ✅ **Pagination Reset** - Automatically resets to page 1 when filter changes
6. ✅ **Auto-sync** - Triggers data sync when filter changes
7. ✅ **Loading States** - Shows loading indicator during filter changes

---

## 🧪 Testing Checklist:

- [ ] Select different program types and verify correct programs display
- [ ] Combine Status + Program Type filters
- [ ] Combine Status + Business + Program Type filters
- [ ] Verify Business dropdown updates when Program Type changes
- [ ] Check pagination works correctly with filters
- [ ] Verify sessionStorage persists filter selection
- [ ] Test "ALL" option shows all program types
- [ ] Verify empty state when no programs match filters

---

## 🎉 Result:

Users can now filter programs by type (BP, CPC, EP, etc.) in addition to Status and Business, making it much easier to find specific types of advertising programs!

**UI Location:** Advertising Programs page → Filter bar → "Program Type:" dropdown

