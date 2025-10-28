# Program Type Filtering - Quick Reference

## 🚀 Quick Start

### For Users:
1. Navigate to **Advertising Programs** page
2. Look for the new **"Program Type:"** dropdown (next to Business dropdown)
3. Select a program type (BP, CPC, EP, etc.) or keep "ALL"
4. Programs will filter automatically

### For Developers:

#### Backend API:
```python
# Get programs filtered by type
GET /api/reseller/programs?program_type=CPC

# Get business IDs filtered by type
GET /api/reseller/business-ids?program_type=BP

# Combined filters
GET /api/reseller/programs?program_status=CURRENT&program_type=CPC&business_id=xyz123
```

#### Frontend Usage:
```typescript
// In components
const { data } = useGetProgramsQuery({
  program_status: 'CURRENT',
  program_type: 'CPC',
  offset: 0,
  limit: 20
});

// Get business IDs with filter
const { data: businesses } = useGetBusinessIdsQuery({
  programStatus: 'CURRENT',
  programType: 'CPC'
});
```

## 📋 Program Types Reference

| Code | Name | Use Case |
|------|------|----------|
| `BP` | Branded Profile | Enhanced branding |
| `EP` | Enhanced Profile | No competitor ads + features |
| `CPC` | Cost Per Click | Pay-per-click campaigns |
| `RCA` | Remove Competitor Ads | Remove competitor ads only |
| `CTA` | Call To Action | Action buttons |
| `SLIDESHOW` | Slideshow | Image galleries |
| `BH` | Business Highlights | Feature highlights |
| `VL` | Verified License | License verification |
| `LOGO` | Logo Feature | Business logo display |
| `PORTFOLIO` | Portfolio Feature | Work examples gallery |

## 🔧 Modified Files

### Backend:
- `backend/ads/sync_service.py` - Added program_type filtering
- `backend/ads/views.py` - Added program_type parameter handling

### Frontend:
- `frontend/src/store/api/yelpApi.ts` - Updated API queries
- `frontend/src/components/ProgramsList.tsx` - Added UI dropdown

## 🧪 Testing Commands

```bash
# Backend - Check if program_name field exists
python manage.py shell
>>> from ads.models import ProgramRegistry
>>> ProgramRegistry.objects.values('program_name').distinct()

# Frontend - Build check
cd frontend
npm run build

# Test API endpoint
curl "http://localhost:8000/api/reseller/programs?program_type=CPC" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 💡 Common Use Cases

### 1. Find all CPC programs
```
Status: ALL → Program Type: CPC
```

### 2. Find current Branded Profiles
```
Status: CURRENT → Program Type: BP
```

### 3. Find CPC programs for specific business
```
Status: ALL → Business: [Select] → Program Type: CPC
```

### 4. Find future Portfolio programs
```
Status: FUTURE → Program Type: PORTFOLIO
```

## 🐛 Troubleshooting

### No programs showing after filter:
- Check if programs have `program_name` field populated
- Verify sync has been run: `python manage.py sync_yelp_programs`
- Check database: `SELECT DISTINCT program_name FROM program_registry;`

### Business dropdown empty:
- Ensure programs exist with selected program_type
- Check filter combination (Status + Program Type)
- Verify API response in browser DevTools

### Filter not persisting:
- Check browser sessionStorage: `sessionStorage.getItem('programsList_programType')`
- Clear cache if needed: `sessionStorage.clear()`

## 📚 Documentation Files

- `PROGRAM_TYPE_FILTERING_IMPLEMENTATION.md` - Detailed implementation guide
- `PROGRAM_TYPE_FILTER_SUMMARY.txt` - Visual summary
- `PROGRAM_TYPE_FILTER_FLOW.txt` - Data flow diagram
- `CHANGES_SUMMARY.md` - Line-by-line changes
- `QUICK_REFERENCE.md` - This file

## 🎯 Key Points

✅ **Backward Compatible** - All changes are optional, existing code works unchanged
✅ **Persistent** - Filter selection saved in sessionStorage
✅ **Combined Filters** - Works with Status and Business filters
✅ **Dynamic Updates** - Business dropdown updates based on program type
✅ **Performance** - Uses database indexes on program_name field

## 📞 Support

If you encounter issues:
1. Check the documentation files listed above
2. Review the data flow diagram in `PROGRAM_TYPE_FILTER_FLOW.txt`
3. Verify database has program_name field populated
4. Check browser console for errors
5. Review Django logs for backend errors

---

**Implementation Date:** October 15, 2025  
**Status:** ✅ Complete and Ready for Testing

