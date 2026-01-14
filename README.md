# 📸 BookYourShoot - Photography Booking Platform (FYP)

> A comprehensive photography booking platform connecting clients with professional photographers across Pakistan. Features secure payments, escrow system, equipment rentals, and intelligent booking management.

## 🚀 Quick Start

```powershell
# Install dependencies
npm install
cd backend && pip install -r requirements.txt && cd ..

# Setup environment files
copy .env.example .env
cd backend && copy .env.example .env && cd ..
# Add your Stripe keys to both .env files

# Start application
.\start-backend.ps1  # Starts backend on port 5000
.\start-app.ps1      # Starts frontend on port 3000
```

**Access**: http://localhost:3000

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Payment System](#-payment-system)
- [Escrow System](#-escrow-system)
- [Demo Pages](#-demo-pages)
- [Setup Guide](#-setup-guide)
- [Testing](#-testing)
- [Project Structure](#-project-structure)

## ✨ Features

### Core Functionality
- 🔍 **Smart Photographer Search** - Filter by city, specialty, price range with 12 mock photographers
- 📅 **Booking Management** - Request bookings, track status, manage calendar
- 💳 **Secure Payments** - Stripe integration with PKR currency support
- 🔒 **Escrow System** - Payment protection for both clients and photographers
- 📷 **Equipment Rental** - Browse and rent photography equipment with deposits
- ⭐ **Reviews & Ratings** - Client feedback system with ratings
- 💬 **Real-time Chat** - Communication between clients and photographers
- 🎵 **Music Discovery** - Spotify integration for video background music
- 🎬 **Reel Generator** - Create Instagram-style reels from photos

### Advanced Features
- 🛡️ **Payment Protection** - Escrow holds funds until work completion
- 📊 **Cancellation Policies** - Tiered refunds based on notice period
- ⏰ **Auto-Release** - Payments released automatically after 7 days
- 💰 **Platform Fees** - 10% commission on completed bookings
- 📱 **Responsive Design** - Mobile-friendly Bootstrap UI
- 🎨 **Blue Theme** - Professional gradient design (#1A73E8)
- 🔐 **CNIC Verification** - ID verification for photographers

## 🛠️ Tech Stack

**Frontend**
- React 18 with React Router
- Bootstrap 5 for UI
- Stripe.js for payments
- Supabase client for auth

**Backend**
- FastAPI (Python 3.13)
- Stripe API for payments
- Supabase PostgreSQL (with mock data fallback)
- Spotify API for music discovery

**Development**
- Node.js & npm
- Python 3.13 & pip
- PowerShell scripts for easy startup

## 💳 Payment System

### Stripe Integration
- **Currency**: PKR (Pakistani Rupees)
- **Test Card**: `4242 4242 4242 4242`
- **Payment Flow**: 
  1. Client books photographer → 50% advance payment
  2. Payment held in escrow by platform
  3. Work completed → Client confirms → Release to photographer
  4. Platform deducts 10% fee

### Payment Endpoints
```
POST /api/payments/create-checkout  - Create Stripe checkout session
GET  /api/payments/status/{id}      - Check payment status
POST /api/payments/refund/{id}      - Process refund
POST /api/payments/webhook          - Stripe webhook handler
```

### Configuration
Add to `backend/.env`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Add to frontend `.env`:
```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 🔒 Escrow System

### How It Works
1. **Payment Made** → Client pays, platform holds money
2. **Work in Progress** → Photographer delivers service
3. **Client Confirms** → Client reviews and releases payment
4. **Auto-Release** → If no action in 7 days, auto-release to photographer
5. **Money Transferred** → 90% to photographer, 10% platform fee

### Cancellation Policy

| Notice Period | Client Refund | Photographer Gets | Example (Rs. 10,000) |
|--------------|---------------|-------------------|---------------------|
| **14+ days** | 100% | 0% | Client: Rs. 10,000 \| Photographer: Rs. 0 |
| **7-13 days** | 50% | 50% | Client: Rs. 5,000 \| Photographer: Rs. 5,000 |
| **3-6 days** | 25% | 75% | Client: Rs. 2,500 \| Photographer: Rs. 7,500 |
| **<3 days** | 0% | 100% | Client: Rs. 0 \| Photographer: Rs. 10,000 |

### Escrow Endpoints
```
POST /api/payments/escrow/create           - Create escrow after payment
POST /api/payments/escrow/release/{id}     - Release payment to photographer
POST /api/payments/escrow/refund/{id}      - Refund with cancellation policy
GET  /api/payments/escrow/photographer/{id}/earnings - View earnings
```

## 🎯 Demo Pages

Visit these URLs after starting the application:

### Main Application
- **Landing Page**: http://localhost:3000/
- **Search Photographers**: http://localhost:3000/search
- **Login**: http://localhost:3000/login
- **Register**: http://localhost:3000/register

### Demo & Testing Pages
- **Payment Test**: http://localhost:3000/payment-test
  - Test Stripe integration
  - Use test card: 4242 4242 4242 4242
  
- **Escrow Demo**: http://localhost:3000/escrow-demo
  - 5 payment scenarios (held, completed, released, cancellable, late)
  - Simulate 7-day auto-release
  - Test cancellation policies
  
- **Booking Summary Demo**: http://localhost:3000/booking-summary-demo
  - 4 scenarios (wedding, equipment, photographer view, commercial)
  - Cost breakdowns
  - Payment schedules

### Booking Flow
1. http://localhost:3000/search - Search photographers
2. http://localhost:3000/photographer/1 - View profile
3. http://localhost:3000/booking/request/1 - Create booking
4. http://localhost:3000/booking/success - After payment

## 📖 Setup Guide

### Prerequisites
- Node.js v16+
- Python 3.13
- Stripe account (free test mode)

### Installation

**1. Clone and Install**
```powershell
git clone <repository>
cd BookYourShoot

# Frontend dependencies
npm install

# Backend dependencies
cd backend
pip install -r requirements.txt
cd ..
```

**2. Environment Setup**

Create `.env` in project root:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
REACT_APP_SUPABASE_URL=https://ygconukadhkajrgckjru.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_key_here
```

Create `backend/.env`:
```env
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
SUPABASE_URL=https://ygconukadhkajrgckjru.supabase.co
SUPABASE_KEY=your_key_here
PORT=5000
```

**3. Get Stripe Keys**
- Sign up at https://stripe.com
- Dashboard → Developers → API Keys
- Copy test keys (pk_test_... and sk_test_...)

**4. Start Application**

Option A - PowerShell Scripts (Recommended):
```powershell
.\start-backend.ps1  # Backend on port 5000
.\start-app.ps1      # Frontend on port 3000
```

Option B - Manual:
```powershell
# Terminal 1 - Backend
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 5000

# Terminal 2 - Frontend
npm start
```

**5. Access Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/docs

## 🧪 Testing

### Test Payment Flow
1. Visit http://localhost:3000/search
2. Select any photographer
3. Click "Book Now" and fill form
4. Click "Proceed to Payment"
5. Use test card: **4242 4242 4242 4242**
   - Expiry: Any future date
   - CVV: Any 3 digits
   - Postal: Any 5 digits
6. View booking success page

### Test Escrow System
1. Visit http://localhost:3000/escrow-demo
2. Try different scenarios:
   - **Payment Held** - See active escrow
   - **Ready to Release** - Confirm work and release
   - **Early Cancel** - Get 100% refund (14+ days)
   - **Late Cancel** - Get 0% refund (<3 days)
3. Click "Simulate 7 Days Passed" to see auto-release

### Mock Data
The application uses mock photographers from `src/data/photographers.json`:
- 12 photographers across 8 cities
- Specialties: Wedding, Portrait, Event, Landscape, Product, Fashion
- Prices: PKR 3,000 - 9,000 per hour
- Realistic ratings and review counts

## 📁 Project Structure

```
BookYourShoot/
├── backend/                 # FastAPI backend
│   ├── main.py             # Application entry
│   ├── routers/            # API endpoints
│   │   ├── payments.py     # Payment & escrow routes
│   │   ├── photographers.py # Photographer search
│   │   ├── booking.py      # Booking management
│   │   └── ...
│   ├── services/           # Business logic
│   │   ├── payment_service.py    # Stripe integration
│   │   ├── escrow_service.py     # Escrow management
│   │   └── spotify_service.py    # Music API
│   └── .env                # Backend config
│
├── src/                    # React frontend
│   ├── pages/
│   │   ├── public/         # Public pages
│   │   │   └── PhotographerSearch.js  # Search with filters
│   │   ├── client/         # Client dashboard
│   │   ├── photographer/   # Photographer dashboard
│   │   ├── EscrowDemoPage.jsx         # Escrow demo
│   │   └── BookingSummaryDemo.jsx     # Booking summary demo
│   ├── components/
│   │   ├── EscrowStatus.jsx          # Escrow widget
│   │   ├── BookingSummary.jsx        # Cost breakdown
│   │   └── StripeCheckout.jsx        # Payment UI
│   ├── api/
│   │   └── api.js          # API client
│   └── data/
│       └── photographers.json  # Mock photographers
│
├── .env                    # Frontend config
├── package.json            # Node dependencies
├── start-app.ps1          # Frontend startup script
├── start-backend.ps1      # Backend startup script
└── README.md              # This file
```

## 🎨 Recent Improvements (This Session)

### Search Page Enhancements
- ✅ Skeleton loading cards (replaced spinner)
- ✅ Error state with retry button
- ✅ Empty state message
- ✅ Active filter count badge
- ✅ Clear all filters button
- ✅ Profile images from ui-avatars.com

### Data Expansion
- ✅ Increased from 6 to 12 mock photographers
- ✅ Diverse cities and specialties
- ✅ Colorful avatar placeholders

### Escrow Features
- ✅ "Simulate 7 days passed" button for auto-release demo
- ✅ Instant feedback on payment release
- ✅ Earnings breakdown

### New Components
- ✅ BookingSummary component with cost breakdowns
- ✅ Demo page with 4 scenarios
- ✅ Platform fee visibility (photographers only)

### Documentation
- ✅ Consolidated README (this file)
- ✅ Environment file templates
- ✅ Setup instructions
- ✅ Demo page URLs

## 🐛 Troubleshooting

**Backend won't start**
```powershell
# Check if port 5000 is in use
netstat -ano | Select-String ":5000"

# Kill process
Stop-Process -Id <PID> -Force
```

**Frontend won't start**
```powershell
# Clear and reinstall
Remove-Item node_modules -Recurse -Force
npm install
```

**Payments not working**
- Verify Stripe keys in both `.env` files
- Check backend console for errors
- Ensure backend is running on port 5000

**No photographers showing**
- Backend auto-uses mock data if database unavailable
- Check console for "Using mock photographer data"
- Verify backend is running

## 🎓 For FYP Presentation

### Key Pages to Demo
1. **Landing** (/) - Hero section, features
2. **Search** (/search) - Filter photographers
3. **Photographer Profile** (/photographer/1) - View details
4. **Booking Flow** (/booking/request/1) - Create booking
5. **Payment** - Stripe checkout (test card)
6. **Success** (/booking/success) - Confirmation
7. **Escrow Demo** (/escrow-demo) - Payment protection
8. **Booking Summary** (/booking-summary-demo) - Cost transparency

### Talking Points
- **Payment Security**: Escrow system protects both parties
- **Cancellation Policy**: Fair refunds based on notice period
- **Auto-Release**: Automated payment after 7 days
- **Platform Fees**: 10% commission model
- **Mock Data**: Fully functional demo without database dependency
- **PKR Currency**: Localized for Pakistani market

## 📊 System Features Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Search & Filter | ✅ | 12 photographers, city/specialty/price filters |
| Booking Request | ✅ | Date, time, service type selection |
| Payment (Stripe) | ✅ | PKR currency, test mode ready |
| Escrow System | ✅ | Hold/release/refund with policies |
| Equipment Rental | ✅ | Browse equipment, deposit handling |
| Cancellation Policy | ✅ | Tiered refunds (100%/50%/25%/0%) |
| Auto-Release | ✅ | 7-day automatic payment release |
| Platform Fee | ✅ | 10% on photographer earnings |
| Reviews & Ratings | ✅ | Client feedback system |
| Real-time Chat | ✅ | Photographer-client messaging |
| CNIC Verification | ✅ | Photographer ID verification |
| Music Discovery | ✅ | Spotify integration |
| Reel Generator | ✅ | Create video reels |

## 📝 API Endpoints

### Photography Services
```
GET  /api/photographers/              # Search photographers
GET  /api/photographers/{id}          # Get photographer details
POST /api/bookings/                   # Create booking
GET  /api/bookings/                   # List user bookings
PUT  /api/bookings/{id}/status        # Update booking status
```

### Payment & Escrow
```
POST /api/payments/create-checkout                    # Create payment
GET  /api/payments/status/{session_id}                # Payment status
POST /api/payments/refund/{session_id}                # Refund payment
POST /api/payments/escrow/create                      # Create escrow
POST /api/payments/escrow/release/{booking_id}        # Release payment
POST /api/payments/escrow/refund/{booking_id}         # Refund with policy
GET  /api/payments/escrow/photographer/{id}/earnings  # View earnings
```

### Equipment
```
GET  /api/equipment/                  # List equipment
GET  /api/equipment/{id}              # Equipment details
POST /api/equipment/                  # Add equipment (photographer)
```

## 🔐 Security Features

- JWT token authentication
- CNIC verification for photographers
- Secure payment processing via Stripe
- Escrow-protected transactions
- Input validation and sanitization
- CORS protection
- Environment variable configuration

## 📱 Responsive Design

- Mobile-first approach
- Bootstrap 5 responsive grid
- Touch-friendly interfaces
- Optimized for all screen sizes

## 🌐 Database

**Supabase PostgreSQL** (with mock data fallback)
- Users table (clients, photographers, admins)
- Bookings with status tracking
- Equipment listings
- Reviews and ratings
- Chat messages
- Payment transactions

**Mock Data**: Application works fully without database using `src/data/photographers.json`

---

## 📧 Contact & Support

For issues or questions about the project, check:
- Backend console for API errors
- Browser DevTools (F12) for frontend errors
- Network tab for API calls
- `/docs` endpoint for API documentation

## 📄 License

This is an FYP (Final Year Project) for educational purposes.

---

**Built with ❤️ for FYP 2026**
