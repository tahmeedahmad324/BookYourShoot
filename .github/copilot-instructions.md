# BookYourShoot - AI Coding Assistant Instructions

## Architecture Overview
BookYourShoot is a dual-stack photography booking platform with **React frontend** (port 3000) and **FastAPI backend** (port 8000). The backend uses Supabase PostgreSQL for data storage and implements an **Integer Linear Programming (ILP) optimization engine** as its core feature for photographer selection.

### Stack Components
- **Frontend**: React 18 + React Router + Bootstrap 5 (legacy CRA in `src/`, Next.js shell in `app/`)
- **Backend**: FastAPI + Uvicorn (Python 3.13) with modular routers in `backend/routers/`
- **Database**: Supabase PostgreSQL (schema in `DATABASE_SCHEMA.md`)
- **Payments**: Stripe integration with PKR currency, escrow system with 50/50 payment model
- **Critical Dependencies**: PuLP (ILP solver), pytesseract (CNIC OCR), spotipy (music discovery)

## Project-Specific Patterns

### Backend Architecture
All API endpoints are under `/api` prefix. Routers follow consistent pattern:
```python
# backend/routers/example.py
from fastapi import APIRouter, Depends
from backend.auth import get_current_user

router = APIRouter(prefix="/example", tags=["Example"])

@router.get("/")
def get_example(current_user: dict = Depends(get_current_user)):
    # Auth returns: {'id': str, 'email': str, 'role': str}
```

**Key Services** in `backend/services/`:
- `optimization_service.py` - ILP photographer selection (Module 3 - CORE FEATURE)
- `photographer_data_service.py` - Attribute normalization engine (Module 2)
- `escrow_service.py` - Payment holds with cancellation policy (14 days = 100% refund, <3 days = 0%)
- `payment_service.py` - Stripe integration wrapper

### ILP Optimization Engine (Module 3)
The star feature. Uses PuLP with CBC solver for photographer selection:
```python
# Objective function weights (sum to 1.0):
# α=0.4 (rating), β=0.3 (price), γ=0.2 (travel), δ=0.1 (experience)
# Decision variable: x_i ∈ {0,1}
# Constraints: budget, availability, gender_preference, specialty
```
**Key endpoints**: `POST /bookings/optimize`, `POST /bookings/optimize/explain`
See `OPTIMIZATION_MODULES_README.md` for mathematical formulation.

### Authentication Pattern
- **Mock tokens**: `mock-jwt-token-{role}` for local testing (client/photographer/admin)
- **Real tokens**: Supabase JWT via `Authorization: Bearer <token>` header
- Auth dependency returns user dict with `id`, `email`, `role` fields
- Frontend stores token in localStorage via `src/context/AuthContext.js`

### Database Schema Notes
- `users` table has single `role` field: 'client' | 'photographer' | 'admin'
- Photographers have extended profile in `photographer_profile` table with bank details
- Booking status workflow: REQUESTED → ACCEPTED → PAID → COMPLETED (see `backend/routers/booking.py`)
- Escrow table tracks payment holds with tiered cancellation policy

## Critical Workflows

### Starting the Application
```powershell
# Backend (port 8000)
.\start-backend.ps1  # Loads .env automatically via python-dotenv

# Frontend (port 3000)
.\start-app.ps1      # React CRA dev server
```
**Important**: Two separate `.env` files required (root + `backend/.env`). Backend needs `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` from Stripe test mode.

### Testing ILP Optimization
```bash
python backend/scripts/test_installation.py  # Verify PuLP + dependencies
python backend/scripts/demo_optimization.py  # See optimization in action
```
Use Swagger UI at `http://localhost:8000/docs` to test `/bookings/optimize` endpoint with test payload from `QUICK_START_GUIDE.md`.

### Payment Flow
1. Client books → Creates escrow hold (50% advance)
2. Photographer accepts → Status: ACCEPTED
3. Client pays → Status: PAID, escrow holds funds
4. Work complete → Client confirms → Escrow releases (90% photographer, 10% platform fee)
5. Auto-release: 7 days after completion if no client action

## Integration Points

### Supabase Integration
- Client initialization in `backend/supabase_client.py` and `src/supabaseClient.js`
- Uses JWT for auth verification in `backend/auth.py`
- Database functions defined as RPC endpoints (see `backend/routers/` for usage patterns)

### Stripe Integration
- Gateway registered in `backend/main.py` on startup
- Test mode only (PKR currency support)
- Webhook handling at `/api/payments/webhook` with signature verification
- Checkout sessions for UI, payment intents for backend processing

### External Services
- **Spotify API**: Music discovery via `backend/services/spotify_service.py` (spotipy library)
- **OCR**: CNIC verification uses pytesseract + OpenCV in `backend/routers/cnic.py`
- **Email**: Gmail SMTP via `backend/services/email_service.py` (optional, controlled by `USE_REAL_EMAIL` in config)

## Conventions & Standards

### Error Handling
FastAPI validation errors are caught globally in `backend/main.py` with detailed logging. Always raise `HTTPException` with status codes:
```python
raise HTTPException(status_code=404, detail="Resource not found")
```

### Response Format
Consistent API response structure:
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed"
}
```

### File Naming
- Backend routers: lowercase with underscores (`booking.py`, not `Booking.py`)
- React components: PascalCase (`ClientDashboard.js`)
- Services: `{feature}_service.py` pattern
- Data files: `backend/data/*.py` for static data (e.g., `punjab_travel_costs.py`)

### Travel Cost Matrix
Punjab city travel costs precomputed in `backend/data/punjab_travel_costs.py` as distance-based matrix (20+ cities). Used in ILP optimization's travel cost normalization.

## Common Pitfalls
1. **Router registration**: Must include router in `backend/main.py` with `/api` prefix
2. **Environment variables**: Backend loads from `backend/.env`, frontend from root `.env`
3. **CORS**: Only `localhost:3000` and `localhost:3001` allowed in backend CORS config
4. **Mock data fallback**: Supabase queries have in-memory fallback if DB unavailable
5. **PuLP solver**: Uses CBC (open-source), not commercial solvers
6. **Next.js confusion**: `app/` directory is shell only, real app is in `src/` (CRA)

## Key Documentation Files
- `DATABASE_SCHEMA.md` - Complete PostgreSQL schema with field descriptions
- `IMPLEMENTATION_SUMMARY.md` - Modules 2, 3, 4 implementation details
- `OPTIMIZATION_MODULES_README.md` - ILP mathematical formulation and architecture
- `VIVA_QUICK_REFERENCE.md` - Optimization engine explainer for presentations
- `PAYMENT_PAYOUT_STATUS.md` - Payment state machine documentation
- `QUICK_START_GUIDE.md` - Step-by-step testing instructions

## Development Notes
- Platform fee: 10% hardcoded in `backend/config.py`
- Auto-release: 7 days configured in escrow service
- Test card: `4242 4242 4242 4242` (Stripe test mode)
- Mock photographers: 12 preloaded in backend for demo
- Windows-focused: PowerShell scripts for startup, paths use backslashes
