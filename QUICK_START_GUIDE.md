# 🎯 QUICK START GUIDE - Optimization Modules

## ✅ Status: Implementation Complete

All modules have been successfully implemented and tested.

---

## 🚀 Quick Start (3 Steps)

### Step 1: Verify Installation
```bash
python backend\scripts\test_installation.py
```

**Expected output:** All tests ✅ pass

### Step 2: Verify Backend Integration
```bash
python backend\scripts\verify_startup.py
```

**Expected output:** All components ✅ verified

### Step 3: Start Backend Server
```bash
python backend/main.py
```

**Server will be available at:**
- API: http://localhost:8000
- Interactive Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 🎯 Testing the Optimization (Via Swagger UI)

1. Open http://localhost:8000/docs
2. Find **POST /bookings/optimize** endpoint
3. Click "Try it out"
4. Use this test payload:

```json
{
  "client_city": "Lahore",
  "event_date": "2026-03-01",
  "max_budget": 50000,
  "gender_preference": null,
  "specialty": null,
  "top_k": 3
}
```

5. Click "Execute"

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "optimization_method": "Integer Linear Programming (ILP)",
    "solver_status": "Optimal",
    "total_candidates": 15,
    "selected_photographers": [
      {
        "photographer_id": "...",
        "name": "John Doe",
        "rating": 4.8,
        "experience_years": 10,
        "price": 35000,
        "travel_cost": 1500,
        "total_cost": 36500,
        "optimization_score": {
          "total_score": 0.8542,
          "rating_contribution": 0.3840,
          "price_contribution": 0.2650,
          "travel_contribution": 0.1852,
          "experience_contribution": 0.0200,
          "weights": {...}
        }
      }
    ]
  }
}
```

---

## 📚 API Endpoints Summary

### MODULE 3: Optimization Endpoints

#### 1. Optimize Photographer Selection
```
POST /bookings/optimize
```
Runs ILP optimization to find best photographer(s).

**Parameters:**
- `client_city` (required): City name
- `event_date` (required): Event date (YYYY-MM-DD)
- `max_budget` (required): Maximum budget in PKR
- `gender_preference` (optional): "male" or "female"
- `specialty` (optional): e.g., "Wedding", "Portrait"
- `top_k` (optional): Number of results (default: 1)

#### 2. Explain Optimization
```
POST /bookings/optimize/explain
```
Returns detailed explanation of optimization results (for viva).

#### 3. Update Normalization Cache
```
POST /bookings/update-normalization-cache
```
Updates min/max values for attribute normalization.

### MODULE 4: Booking Workflow Endpoints

#### 4. Create Booking
```
POST /bookings
```
Creates booking from optimization result.

**Enhanced fields:**
- `optimization_score`: Score data from optimization

**Validations:**
- ✅ Photographer availability check
- ✅ Double booking prevention
- ✅ Status initialization (REQUESTED)

#### 5. Update Booking Status
```
PUT /bookings/{booking_id}/status
```
Updates booking status with workflow validation.

**Valid transitions:**
- REQUESTED → ACCEPTED (photographer)
- ACCEPTED → PAID (client)
- PAID → COMPLETED (photographer)
- Any → CANCELLED (both)
- REQUESTED → REJECTED (photographer)

---

## 📊 Module Architecture

```
Client Request
      ↓
[MODULE 2: Data Engine]
• Fetch photographers
• Normalize attributes
• Calculate travel costs
      ↓
[MODULE 3: ILP Optimizer] ⭐
• Formulate ILP problem
• Apply constraints
• Solve optimization
• Generate score breakdown
      ↓
[MODULE 4: Booking Workflow]
• Create booking
• Manage status transitions
• Prevent double booking
      ↓
Response to Client
```

---

## 🎓 For VIVA Presentation

### Key Files to Reference:
1. **VIVA_QUICK_REFERENCE.md** - Talking points and Q&A
2. **OPTIMIZATION_MODULES_README.md** - Technical documentation
3. **backend/services/optimization_service.py** - Core ILP engine

### Demo Flow:
1. Show problem statement
2. Run optimization via Swagger UI
3. Explain objective function
4. Show score breakdown
5. Create booking
6. Demonstrate workflow

### Key Points to Emphasize:
- ✅ "This is ILP, not filtering"
- ✅ "Mathematically optimal solution"
- ✅ "Multi-objective optimization"
- ✅ "Explainable results"
- ✅ "Real-world constraints"

---

## 🔍 Troubleshooting

### Issue: Import errors
**Solution:** Run scripts from project root directory
```bash
cd C:\Users\hp\Documents\GitHub\BookYourShoot
python backend\scripts\test_installation.py
```

### Issue: No photographers in database
**Solution:** Optimization will return empty results. Add photographers via API or use mock data.

### Issue: Solver not found
**Solution:** Reinstall PuLP
```bash
pip install --upgrade pulp
```

### Issue: Module not found errors
**Solution:** Ensure you're in project root and backend package is importable
```bash
cd BookYourShoot
python -c "import backend; print('OK')"
```

---

## 📁 Important Files

### Core Implementation:
- `backend/services/optimization_service.py` - ILP engine ⭐
- `backend/services/photographer_data_service.py` - Data normalization
- `backend/data/punjab_travel_costs.py` - Travel cost matrix
- `backend/routers/booking.py` - API endpoints

### Testing & Verification:
- `backend/scripts/test_installation.py` - Installation check
- `backend/scripts/verify_startup.py` - Startup verification
- `backend/scripts/demo_optimization.py` - Full demo script

### Documentation:
- `OPTIMIZATION_MODULES_README.md` - Full technical docs
- `VIVA_QUICK_REFERENCE.md` - Viva preparation
- `IMPLEMENTATION_SUMMARY.md` - Implementation overview
- `QUICK_START_GUIDE.md` - This file

---

## ✅ Verification Checklist

Before viva, ensure:
- [ ] Backend starts without errors: `python backend/main.py`
- [ ] All tests pass: `python backend\scripts\test_installation.py`
- [ ] Swagger UI accessible: http://localhost:8000/docs
- [ ] Can run optimization endpoint successfully
- [ ] Understand objective function: `Σ (α·R + β·P + γ·T + δ·E) · x`
- [ ] Can explain constraints
- [ ] Know the difference between filtering and optimization
- [ ] Can demonstrate workflow transitions
- [ ] Reviewed VIVA_QUICK_REFERENCE.md

---

## 🎉 Summary

**What was built:**
- ✅ MODULE 2: Photographer data normalization engine
- ✅ MODULE 3: ILP optimization engine (CORE FEATURE)
- ✅ MODULE 4: Booking workflow with status management

**Technology:**
- ✅ PuLP library for ILP
- ✅ CBC solver for optimization
- ✅ FastAPI for API endpoints
- ✅ Supabase for data persistence

**Status:**
- ✅ All modules implemented
- ✅ All tests passing
- ✅ Fully documented
- ✅ Ready for viva

---

## 📞 Quick Commands Reference

```bash
# Installation test
python backend\scripts\test_installation.py

# Startup verification
python backend\scripts\verify_startup.py

# Start server
python backend/main.py

# Run demo (requires auth)
python backend\scripts\demo_optimization.py

# Install missing dependencies
pip install pulp
```

---

**Last Updated:** January 16, 2026  
**Status:** ✅ Production Ready  
**Viva Status:** ✅ Ready to Present

Good luck! 🎓✨
