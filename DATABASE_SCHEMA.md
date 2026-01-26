# BookYourShoot - Complete Database Schema

## Overview
This document defines the complete database schema for the BookYourShoot photography booking platform using PostgreSQL (Supabase).

**Payment Model:** Standard 50/50 - Client pays 50% advance to confirm booking, 50% after work completion.

---

## 1. USERS TABLE (`users`)
**Stores all user accounts (clients, photographers, admins)**

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    city VARCHAR(100),
    role VARCHAR(20) DEFAULT 'client' CHECK (role IN ('client', 'photographer', 'admin')),
    profile_picture_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Fields:**
- `id` - UUID primary key (auto-generated)
- `email` - User's email (unique, used for login)
- `full_name` - User's full name
- `phone` - Contact phone number (format: +92XXXXXXXXXX or 03XXXXXXXXX)
- `city` - User's city/location
- `role` - User type: 'client', 'photographer', or 'admin'
- `profile_picture_url` - URL to profile photo (Supabase Storage)
- `is_active` - Account status (soft delete)
- `created_at` - Registration timestamp
- `updated_at` - Last profile update

---

## 2. PHOTOGRAPHER_PROFILE TABLE (`photographer_profile`)
**Extended profile information for photographers including bank details for payouts**

```sql
CREATE TABLE photographer_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    specialty TEXT[], -- Array: ['wedding', 'portrait', 'event', 'product', 'fashion']
    experience INTEGER DEFAULT 0, -- Years of experience
    hourly_rate DECIMAL(10, 2) DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    reviews_count INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    response_time VARCHAR(50) DEFAULT '24 hours',
    location VARCHAR(255),
    
    -- Verification
    verified BOOLEAN DEFAULT false,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    cnic_number VARCHAR(15), -- Pakistani CNIC: XXXXX-XXXXXXX-X
    cnic_front_url TEXT, -- Supabase Storage URL
    cnic_back_url TEXT,
    
    -- Profile Details
    portfolio JSONB, -- Array of portfolio image URLs
    availability JSONB, -- Weekly schedule: {"monday": "available", "tuesday": "busy", ...}
    services JSONB, -- Service packages with pricing
    equipment JSONB, -- List of owned equipment (for display)
    awards TEXT[],
    education VARCHAR(255),
    languages TEXT[] DEFAULT ARRAY['English', 'Urdu'],
    
    -- BANK DETAILS FOR PAYOUTS (Required for receiving payments)
    bank_name VARCHAR(100), -- HBL, UBL, MCB, Meezan, Allied, etc.
    bank_account_title VARCHAR(255), -- Account holder name (must match CNIC)
    bank_account_number VARCHAR(30), -- Account number or IBAN (PK36XXXX...)
    bank_branch_code VARCHAR(20), -- Optional branch code
    
    -- MOBILE WALLET (Alternative payout method)
    jazzcash_number VARCHAR(15), -- 03XX-XXXXXXX
    easypaisa_number VARCHAR(15), -- 03XX-XXXXXXX
    preferred_payout_method VARCHAR(20) DEFAULT 'bank' CHECK (preferred_payout_method IN ('bank', 'jazzcash', 'easypaisa')),
    
    -- Payout Status
    payout_verified BOOLEAN DEFAULT false, -- Bank account verified
    total_earnings DECIMAL(12, 2) DEFAULT 0, -- Lifetime earnings
    available_balance DECIMAL(12, 2) DEFAULT 0, -- Ready for withdrawal
    pending_balance DECIMAL(12, 2) DEFAULT 0, -- In escrow
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_photographer_user_id ON photographer_profile(user_id);
CREATE INDEX idx_photographer_verified ON photographer_profile(verified);
CREATE INDEX idx_photographer_location ON photographer_profile(location);
CREATE INDEX idx_photographer_payout_verified ON photographer_profile(payout_verified);
```

**Key Fields:**
- `user_id` - Foreign key to users table (one-to-one)
- `bank_name`, `bank_account_title`, `bank_account_number` - Required for payouts
- `preferred_payout_method` - Bank transfer, JazzCash, or EasyPaisa
- `available_balance` - Amount ready to withdraw
- `pending_balance` - Amount held in escrow

---

## 3. BOOKING TABLE (`booking`)
**All photography booking requests and confirmations**

```sql
CREATE TYPE booking_status AS ENUM (
    'requested', 'accepted', 'rejected', 'confirmed', 
    'in_progress', 'completed', 'cancelled'
);

CREATE TABLE booking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    photographer_id UUID REFERENCES photographer_profile(id) ON DELETE CASCADE,
    
    -- Event Details
    event_date DATE NOT NULL,
    event_time TIME,
    location TEXT,
    event_type VARCHAR(100), -- wedding, portrait, event, product
    duration INTEGER DEFAULT 1, -- Hours
    service_type VARCHAR(100), -- Specific service package name
    notes TEXT, -- Client's special requests
    
    -- Pricing (50/50 Model)
    price DECIMAL(10, 2) NOT NULL, -- Total booking price
    advance_payment DECIMAL(10, 2), -- 50% upfront
    remaining_payment DECIMAL(10, 2), -- 50% after completion
    platform_fee DECIMAL(10, 2), -- 10% commission
    photographer_earning DECIMAL(10, 2), -- After platform fee (90%)
    
    -- Payment Status
    advance_paid BOOLEAN DEFAULT false,
    advance_paid_at TIMESTAMP,
    advance_transaction_id VARCHAR(255),
    remaining_paid BOOLEAN DEFAULT false,
    remaining_paid_at TIMESTAMP,
    remaining_transaction_id VARCHAR(255),
    
    -- Booking Status
    status booking_status DEFAULT 'requested',
    completed_at TIMESTAMP,
    
    -- Cancellation
    cancellation_reason TEXT,
    cancelled_by VARCHAR(20), -- 'client' or 'photographer'
    cancellation_date TIMESTAMP,
    refund_amount DECIMAL(10, 2),
    refund_status VARCHAR(20), -- 'pending', 'processed', 'rejected'
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_booking_client ON booking(client_id);
CREATE INDEX idx_booking_photographer ON booking(photographer_id);
CREATE INDEX idx_booking_status ON booking(status);
CREATE INDEX idx_booking_event_date ON booking(event_date);
```

**Payment Flow:**
1. Client books → `status: 'requested'`
2. Photographer accepts → `status: 'accepted'`
3. Client pays 50% advance → `advance_paid: true`, `status: 'confirmed'`
4. Event day → `status: 'in_progress'`
5. Work completed → Client pays remaining 50% → `remaining_paid: true`
6. Client confirms → `status: 'completed'`
7. After 7 days → Funds released to photographer

---

## 4. PAYMENT TABLE (`payment`)
**All payment transactions and escrow records**

```sql
CREATE TYPE payment_status AS ENUM (
    'pending', 'processing', 'completed', 'failed', 'refunded', 'escrowed', 'released'
);

CREATE TABLE payment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES booking(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id),
    photographer_id UUID REFERENCES photographer_profile(id),
    
    -- Payment Details
    amount DECIMAL(10, 2) NOT NULL,
    payment_type VARCHAR(20) CHECK (payment_type IN ('advance', 'remaining', 'full', 'refund', 'tip')),
    payment_method VARCHAR(50), -- stripe, jazzcash, easypaisa, bank_transfer
    currency VARCHAR(10) DEFAULT 'PKR',
    
    -- Transaction IDs
    stripe_payment_id VARCHAR(255),
    stripe_session_id VARCHAR(255),
    transaction_id VARCHAR(255),
    
    -- Status
    status payment_status DEFAULT 'pending',
    
    -- Escrow (for advance payments)
    escrowed BOOLEAN DEFAULT false,
    escrow_release_date TIMESTAMP, -- Auto-release after 7 days
    escrow_status VARCHAR(20) CHECK (escrow_status IN ('held', 'released', 'disputed', 'refunded')),
    released_at TIMESTAMP,
    
    -- Breakdown
    platform_fee DECIMAL(10, 2), -- 10% commission
    photographer_amount DECIMAL(10, 2), -- 90% to photographer
    
    -- Metadata
    receipt_url TEXT, -- PDF receipt URL
    failure_reason TEXT,
    refund_reason TEXT,
    refunded_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_booking ON payment(booking_id);
CREATE INDEX idx_payment_client ON payment(client_id);
CREATE INDEX idx_payment_photographer ON payment(photographer_id);
CREATE INDEX idx_payment_status ON payment(status);
CREATE INDEX idx_payment_escrow_status ON payment(escrow_status);
```

---

## 5. PAYOUT TABLE (`payout`)
**Track payouts to photographers**

```sql
CREATE TYPE payout_status AS ENUM (
    'pending', 'processing', 'completed', 'failed'
);

CREATE TABLE payout (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photographer_id UUID REFERENCES photographer_profile(id) ON DELETE CASCADE,
    
    -- Payout Details
    amount DECIMAL(10, 2) NOT NULL,
    payout_method VARCHAR(20) CHECK (payout_method IN ('bank', 'jazzcash', 'easypaisa')),
    
    -- Bank Details (snapshot at time of payout)
    bank_name VARCHAR(100),
    account_title VARCHAR(255),
    account_number VARCHAR(30),
    
    -- Mobile Wallet (if applicable)
    wallet_number VARCHAR(15),
    
    -- Status
    status payout_status DEFAULT 'pending',
    
    -- Processing
    processed_by UUID REFERENCES users(id), -- Admin who processed
    processed_at TIMESTAMP,
    transaction_reference VARCHAR(255), -- Bank reference number
    failure_reason TEXT,
    
    -- Source Payments
    payment_ids UUID[], -- Array of payment IDs included in this payout
    booking_ids UUID[], -- Array of booking IDs
    
    -- Period
    period_start DATE,
    period_end DATE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payout_photographer ON payout(photographer_id);
CREATE INDEX idx_payout_status ON payout(status);
CREATE INDEX idx_payout_created ON payout(created_at DESC);
```

---

## 6. EQUIPMENT TABLE (`equipment`)
**Photography equipment owned by photographers (for rental/showcase)**

```sql
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photographer_id UUID REFERENCES photographer_profile(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('camera', 'lens', 'lighting', 'audio', 'accessory', 'other')),
    brand VARCHAR(100),
    model VARCHAR(100),
    description TEXT,
    purchase_date DATE,
    condition VARCHAR(20) CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
    rental_price_per_day DECIMAL(10, 2) DEFAULT 0,
    available BOOLEAN DEFAULT true, -- Available for rent
    is_active BOOLEAN DEFAULT true, -- Soft delete
    notes TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_equipment_photographer ON equipment(photographer_id);
CREATE INDEX idx_equipment_category ON equipment(category);
CREATE INDEX idx_equipment_available ON equipment(available);
```

---

## 7. EQUIPMENT_RENTAL TABLE (`equipment_rental`)
**Equipment rental bookings**

```sql
CREATE TABLE equipment_rental (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    renter_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Photographer renting
    owner_id UUID REFERENCES photographer_profile(id), -- Equipment owner
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER,
    rental_price DECIMAL(10, 2) NOT NULL,
    security_deposit DECIMAL(10, 2),
    status VARCHAR(20) CHECK (status IN ('requested', 'approved', 'active', 'returned', 'cancelled')),
    payment_status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rental_equipment ON equipment_rental(equipment_id);
CREATE INDEX idx_rental_renter ON equipment_rental(renter_id);
CREATE INDEX idx_rental_dates ON equipment_rental(start_date, end_date);
```

---

## 8. REVIEW TABLE (`review`)
**Client reviews and ratings for photographers**

```sql
CREATE TABLE review (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID UNIQUE REFERENCES booking(id) ON DELETE CASCADE, -- One review per booking
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    photographer_id UUID REFERENCES photographer_profile(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    service_type VARCHAR(100),
    would_recommend BOOLEAN DEFAULT true,
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    photographer_response TEXT, -- Photographer can reply
    response_date TIMESTAMP,
    is_verified BOOLEAN DEFAULT false, -- Verified booking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_review_photographer ON review(photographer_id);
CREATE INDEX idx_review_client ON review(client_id);
CREATE INDEX idx_review_rating ON review(rating);
```

---

## 9. COMPLAINTS TABLE (`complaints`)
**User complaints and dispute resolution**

```sql
CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Who filed complaint
    booking_id UUID REFERENCES booking(id),
    photographer_id UUID REFERENCES photographer_profile(id),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) CHECK (category IN ('payment', 'service_quality', 'cancellation', 'behavior', 'equipment_rental', 'other')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'escalated')),
    assigned_to UUID REFERENCES users(id), -- Admin handling case
    resolution TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_complaints_user ON complaints(user_id);
CREATE INDEX idx_complaints_photographer ON complaints(photographer_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_category ON complaints(category);
```

---

## 10. SUPPORT_TICKETS TABLE (`support_tickets`)
**Customer support ticket system**

```sql
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('technical', 'billing', 'account', 'booking', 'other')),
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
    assigned_to UUID REFERENCES users(id), -- Admin/support agent
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_support_ticket_user ON support_tickets(user_id);
CREATE INDEX idx_support_messages_ticket ON support_messages(ticket_id);
```

---

## 11. CHAT_MESSAGES TABLE (`chat_messages`)
**Direct messaging between clients and photographers**

```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES booking(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    attachment_url TEXT, -- Image/file attachments
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_booking ON chat_messages(booking_id);
CREATE INDEX idx_chat_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_receiver ON chat_messages(receiver_id);
CREATE INDEX idx_chat_read ON chat_messages(read);
```

---

## 12. NOTIFICATIONS TABLE (`notifications`)
**System notifications for users**

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('booking', 'payment', 'message', 'review', 'payout', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link TEXT, -- Deep link to relevant page
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

---

## 13. REELS TABLE (`reels`)
**User-generated video reels from photos**

```sql
CREATE TABLE reels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES booking(id),
    title VARCHAR(255),
    description TEXT,
    video_url TEXT NOT NULL, -- Supabase Storage URL
    thumbnail_url TEXT,
    duration INTEGER, -- Seconds
    music_track VARCHAR(255),
    spotify_track_id VARCHAR(255),
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reels_user ON reels(user_id);
CREATE INDEX idx_reels_public ON reels(is_public);
```

---

## 14. PLATFORM_SETTINGS TABLE (`platform_settings`)
**Admin configuration settings**

```sql
CREATE TABLE platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    data_type VARCHAR(20) CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Default settings
INSERT INTO platform_settings (key, value, data_type, description) VALUES
('platform_fee_percent', '10', 'number', 'Platform commission percentage'),
('escrow_release_days', '7', 'number', 'Days before auto-release after completion'),
('advance_payment_percent', '50', 'number', 'Advance payment percentage'),
('cancellation_fee_48h', '0', 'number', 'Cancellation fee if cancelled >48h before'),
('cancellation_fee_24h', '25', 'number', 'Cancellation fee if cancelled 24-48h before'),
('cancellation_fee_12h', '50', 'number', 'Cancellation fee if cancelled 12-24h before'),
('cancellation_fee_0h', '100', 'number', 'No refund if cancelled <12h before'),
('min_payout_amount', '1000', 'number', 'Minimum amount for payout request (PKR)');
```

---

## 15. AUDIT_LOG TABLE (`audit_log`)
**Track all important actions for compliance**

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- login, booking_created, payment_processed, payout_completed, etc.
    entity_type VARCHAR(50), -- booking, payment, user, payout, etc.
    entity_id UUID,
    details JSONB, -- Additional context
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
```

---

## Summary: Payment & Payout Flow

### **Standard 50/50 Payment Model:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOOKYOURSHOOT PAYMENT FLOW                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CLIENT BOOKS PHOTOGRAPHER                                   │
│     └── Total: PKR 30,000                                       │
│                                                                 │
│  2. CLIENT PAYS 50% ADVANCE                                     │
│     └── Advance: PKR 15,000 (via Stripe)                        │
│     └── Status: 'confirmed'                                     │
│     └── Money held in ESCROW                                    │
│                                                                 │
│  3. PHOTOGRAPHER COMPLETES WORK                                 │
│     └── Client pays remaining PKR 15,000                        │
│     └── Status: 'completed'                                     │
│                                                                 │
│  4. ESCROW RELEASE (7 days after completion)                    │
│     └── Platform fee: PKR 3,000 (10%)                           │
│     └── Photographer receives: PKR 27,000 (90%)                 │
│                                                                 │
│  5. PAYOUT TO PHOTOGRAPHER                                      │
│     └── Bank Transfer / JazzCash / EasyPaisa                    │
│     └── Weekly batch processing                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### **What to Collect from Photographers:**

**During Registration:**
- Full name, email, phone, city
- CNIC (front & back images)

**During Profile Setup:**
- Bio, specialty, experience, hourly rate
- Portfolio images
- Services & pricing

**For Payouts (Required):**
- Bank name (dropdown)
- Account holder name (must match CNIC)
- Account number / IBAN
- OR JazzCash/EasyPaisa number
- Preferred payout method

---

## Pakistani Banks (For Dropdown)

```javascript
const PAKISTANI_BANKS = [
  "Allied Bank Limited (ABL)",
  "Askari Bank",
  "Bank Alfalah",
  "Bank Al-Habib",
  "Faysal Bank",
  "Habib Bank Limited (HBL)",
  "Habib Metropolitan Bank",
  "JS Bank",
  "MCB Bank",
  "Meezan Bank",
  "National Bank of Pakistan (NBP)",
  "Silk Bank",
  "Soneri Bank",
  "Standard Chartered Pakistan",
  "Summit Bank",
  "The Bank of Punjab",
  "United Bank Limited (UBL)",
  "Other"
];
```

---

## Next Steps

The schema is ready! Now implement:
1. ✅ Bank account collection form (photographer registration)
2. ✅ Photographer earnings dashboard
3. ✅ Admin payout management panel
4. ✅ Payout processing & notifications
