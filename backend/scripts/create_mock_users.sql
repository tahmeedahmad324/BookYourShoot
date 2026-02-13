-- ============================================
-- Create Mock Test Accounts for Development
-- ============================================
-- Run this in Supabase Dashboard -> SQL Editor
-- These accounts match backend/config.py MOCK_ACCOUNTS

-- Insert mock users (ignore if they already exist)
INSERT INTO users (id, email, full_name, phone, city, role, profile_picture_url, is_active)
VALUES 
    -- Client Account
    (
        '257f9b67-99fa-44ce-ae67-6229c36380b5',
        'client@test.com',
        'Test Client',
        '+923001234567',
        'Lahore',
        'client',
        NULL,
        true
    ),
    -- Photographer Account
    (
        '21bf398a-e012-4c4d-9b55-caeac7ec6dc7',
        'photographer@test.com',
        'Test Photographer',
        '+923009876543',
        'Karachi',
        'photographer',
        NULL,
        true
    ),
    -- Admin Account
    (
        '5fb7a96b-3dd0-4d44-9631-c07a256292ee',
        'admin@test.com',
        'Test Admin',
        '+923005555555',
        'Islamabad',
        'admin',
        NULL,
        true
    )
ON CONFLICT (id) DO NOTHING;

-- Create photographer profile for the test photographer
-- Using only columns that actually exist in the database
INSERT INTO photographer_profile (
    id,
    user_id,
    bio,
    specialties,
    experience_years,
    hourly_rate,
    rating_avg,
    reviews_count,
    verified
)
VALUES (
    'ba123456-7890-4bcd-ef12-345678901234',
    '21bf398a-e012-4c4d-9b55-caeac7ec6dc7',
    'Professional photographer specializing in weddings, portraits, and events. Available for bookings across Pakistan.',
    ARRAY['wedding', 'portrait', 'event', 'product'],
    5,
    3500.00,
    4.8,
    42,
    true
)
ON CONFLICT (user_id) DO UPDATE SET
    bio = EXCLUDED.bio,
    specialties = EXCLUDED.specialties,
    experience_years = EXCLUDED.experience_years,
    hourly_rate = EXCLUDED.hourly_rate,
    verified = EXCLUDED.verified,
    rating_avg = EXCLUDED.rating_avg,
    reviews_count = EXCLUDED.reviews_count;

-- Verify users were created
SELECT 
    id, 
    email, 
    full_name, 
    role, 
    is_active,
    created_at
FROM users 
WHERE email IN ('client@test.com', 'photographer@test.com', 'admin@test.com')
ORDER BY role;

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '✅ Mock test accounts created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Login Credentials (all use same password):';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'Email: client@test.com';
    RAISE NOTICE 'Password: Test@1234';
    RAISE NOTICE 'Role: Client';
    RAISE NOTICE '';
    RAISE NOTICE 'Email: photographer@test.com';
    RAISE NOTICE 'Password: Test@1234';
    RAISE NOTICE 'Role: Photographer';
    RAISE NOTICE 'Profile: http://localhost:3000/photographer/21bf398a-e012-4c4d-9b55-caeac7ec6dc7';
    RAISE NOTICE '';
    RAISE NOTICE 'Email: admin@test.com';
    RAISE NOTICE 'Password: Test@1234';
    RAISE NOTICE 'Role: Admin';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Next Steps:';
    RAISE NOTICE '1. Login as client@test.com';
    RAISE NOTICE '2. Visit photographer profile link above';
    RAISE NOTICE '3. Click "💬 Chat" button to test messaging!';
END $$;
