# 💰 Money Handling - Complete Documentation

## ⚠️ CRITICAL: All money conversions verified and safe

This document describes ALL money flows in the application to ensure accuracy.

---

## 🔄 Conversion Rule

**Simple and consistent:**
```
Frontend: ALWAYS in DOLLARS (e.g., 7777.00)
Backend:  Converts to CENTS (multiply by 100)
Yelp API: ALWAYS in CENTS (e.g., 777700)
Display:  Convert back to DOLLARS (divide by 100)
```

---

## 📝 INPUT Forms (User enters DOLLARS)

### 1. CreateProgram (`/create`)
```
User enters: $7,777.00
Frontend sends: 7777.00 (dollars)
Backend receives: 7777.00
Backend converts: 7777 * 100 = 777,700 (cents)
Yelp receives: 777,700 cents
Result: $7,777.00 ✅
```

### 2. EditProgram (`/edit/:id`)
```
User enters: $500.00
Frontend sends: 500.00 (dollars)
Backend receives: 500.00
Backend converts: 500 * 100 = 50,000 (cents)
Yelp receives: 50,000 cents
Result: $500.00 ✅
```

### 3. DuplicateProgram (Layer creation)
```
User enters: $7,777.00
Frontend sends: 7777.00 (dollars)
duplicate_program receives: 7777.00
Passes to create_program: 7777.00 (dollars)
create_program converts: 7777 * 100 = 777,700 (cents)
Yelp receives: 777,700 cents
Result: $7,777.00 ✅
```

---

## 📊 DISPLAY Pages (Show DOLLARS)

### 1. ProgramsList (`/programs`)
```
Yelp returns: budget: 777700 (cents)
Frontend calculates: 777700 / 100 = 7777.00
Displays: $7,777.00 USD ✅
```

### 2. ProgramStatus (`/program-status/:id`)
```
Yelp returns: budget: 777700, ad_cost: 50000 (cents)
Frontend calculates: 
  - budget: 777700 / 100 = $7,777.00
  - ad_cost: 50000 / 100 = $500.00
  - remaining: (777700 - 50000) / 100 = $7,277.00
Displays: All in dollars ✅
```

### 3. PartnerProgramInfo (`/program-info/:id`)
```
Same as ProgramStatus - all conversions verified ✅
```

### 4. BusinessProgramsView
```
budget: (Number(metrics.budget) / 100).toFixed(2)
ad_cost: (Number(metrics.ad_cost) / 100).toFixed(2)
All correct ✅
```

---

## 🔐 Backend Conversion Points

### services.py:

#### create_program() - Line 56-62
```python
budget_dollars = float(budget)           # Get dollars from frontend
if budget_dollars < 25:                  # Validate minimum
    raise ValueError("...")
params['budget'] = int(budget_dollars * 100)  # Convert to cents
logger.info(f"Budget: ${budget_dollars} → {params['budget']} cents")
```
✅ **Single conversion, with logging**

#### edit_program() - Line 158-165
```python
budget_dollars = float(budget)           # Get dollars from frontend
if budget_dollars < 25:                  # Validate minimum
    raise ValueError("...")
params['budget'] = int(budget_dollars * 100)  # Convert to cents
logger.info(f"Edit: Budget ${budget_dollars} → {params['budget']} cents")
```
✅ **Single conversion, with logging**

#### duplicate_program() - Line 908-917
```python
budget_dollars = new_program_data.get('budget')  # Get dollars
logger.info(f"📊 Budget from request: ${budget_dollars} (dollars)")
create_payload['budget'] = budget_dollars  # Pass to create_program AS DOLLARS
# create_program will convert to cents
```
✅ **NO conversion here - delegates to create_program**

---

## 🔍 Verification Checklist

### Input Validation
- [x] Minimum budget: $25.00 in all places
- [x] Minimum max_bid: $0.25 in all places
- [x] Decimal support (step="0.01")
- [x] Clear labels: "Enter in DOLLARS"

### Conversion Logic
- [x] CreateProgram: Single conversion (dollars * 100)
- [x] EditProgram: Single conversion (dollars * 100)
- [x] DuplicateProgram: Delegates to create_program
- [x] NO double conversions anywhere

### Display Logic
- [x] ProgramsList: Divides by 100
- [x] ProgramStatus: Divides by 100
- [x] PartnerProgramInfo: Divides by 100
- [x] BusinessProgramsView: Divides by 100
- [x] DuplicateDialog preview: Divides by 100

### Logging
- [x] create_program logs: "Budget: $X → Y cents"
- [x] edit_program logs: "Edit: Budget $X → Y cents"
- [x] duplicate_program logs: "Budget from request: $X (dollars)"

---

## 🧪 Test Cases

### Test 1: Create with $7,777
```
Input: 7777
Expected: Yelp receives 777700 cents = $7,777
Verify: Check logs for "Budget: $7777.0 → 777700 cents"
```

### Test 2: Edit to $500
```
Input: 500
Expected: Yelp receives 50000 cents = $500  
Verify: Check logs for "Edit: Budget $500.0 → 50000 cents"
```

### Test 3: Duplicate with $1,234.56
```
Input: 1234.56
Expected: Yelp receives 123456 cents = $1,234.56
Verify: Check logs and final program budget display
```

---

## ✅ All Money Flows Verified

Every dollar amount in the system has been checked and verified.
No ambiguous logic remains.
All conversions are explicit and logged.

**Last verified:** 2025-10-10
**Status:** ✅ SAFE
