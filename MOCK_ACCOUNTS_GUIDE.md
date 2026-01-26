# Mock Test Accounts - Quick Reference

## 🎯 Purpose
Bypass Supabase rate limits during development and testing without creating real auth users.

## 📝 Test Credentials

All accounts use the same password: **`Test@1234`**

| Email | Password | Role | Use For |
|-------|----------|------|---------|
| `client@test.com` | `Test@1234` | Client | Testing booking creation, payments, reviews |
| `photographer@test.com` | `Test@1234` | Photographer | Testing job acceptance, portfolio, payouts |
| `admin@test.com` | `Test@1234` | Admin | Testing admin dashboard, user management |

## 🚀 Setup Instructions

### 1. Add Users to Database

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Copy the entire content from: backend/scripts/create_mock_users.sql
```

Or manually run the script file located at:
```
backend/scripts/create_mock_users.sql
```

This creates 3 users in your `users` table with fixed UUIDs that match the backend configuration.

### 2. Verify Users Created

In Supabase Dashboard → **Table Editor → users**, you should see:
- client@test.com (role: client)
- photographer@test.com (role: photographer)  
- admin@test.com (role: admin)

### 3. Login to Test

1. Go to http://localhost:3000/login
2. Enter any test email (e.g., `client@test.com`)
3. Enter password: `Test@1234`
4. Select appropriate role
5. Click Login

✅ **No rate limits!** - Mock accounts bypass Supabase completely.

## 🔧 How It Works

### Backend
- `backend/config.py` defines MOCK_ACCOUNTS with credentials
- `backend/routers/auth.py` has `/mock-login` endpoint
- Mock accounts skip Supabase auth entirely

### Frontend
- `src/api/auth.js` checks if email is in mock list
- Calls `/api/auth/mock-login` instead of Supabase
- `src/context/AuthContext.js` stores mock user in localStorage
- Mock sessions persist across page refreshes

## 🎨 Features

✅ **No Rate Limits** - Unlimited login attempts  
✅ **Instant Login** - No email verification needed  
✅ **Persistent Sessions** - Stays logged in across refreshes  
✅ **Role Testing** - Test all 3 roles without creating multiple accounts  
✅ **Clean Logout** - Clear localStorage on logout  

## 🔐 Security Notes

⚠️ **Development Only** - These accounts should only exist in development/testing environments

⚠️ **Fixed Credentials** - Everyone on the team knows these passwords - don't store sensitive data

⚠️ **Backend Validation** - `/mock-login` endpoint only accepts these specific emails

## 🧪 Testing Scenarios

### Test Client Flow
1. Login as `client@test.com`
2. Browse photographers
3. Create a booking
4. Make a payment (Stripe test mode)
5. Leave a review
6. Logout

### Test Photographer Flow
1. Login as `photographer@test.com`
2. View booking requests
3. Accept/reject jobs
4. Upload portfolio images
5. Update availability
6. Check payout status
7. Logout

### Test Admin Flow
1. Login as `admin@test.com`
2. View all users
3. Handle complaints
4. View analytics
5. Manage escrow disputes
6. Logout

## 🐛 Troubleshooting

### "Invalid credentials" error
- Verify you're using exact email: `client@test.com` (not Client@Test.com)
- Password is case-sensitive: `Test@1234`
- Check backend is running on port 8000

### "User not found" in dashboard
- Run the SQL script in Supabase to create DB records
- Verify IDs match between `config.py` and database

### Mock user doesn't persist
- Check browser localStorage has `mock_user` key
- Clear localStorage and login again
- Verify AuthContext is checking for mock_user on load

### Rate limit still happening
- Make sure you're using test accounts (`@test.com` emails)
- Check browser console for "Mock login successful" message
- Verify `MOCK_ACCOUNTS` list in `src/api/auth.js` includes the email

## 📂 Related Files

- `backend/config.py` - Mock account definitions
- `backend/routers/auth.py` - `/mock-login` endpoint
- `backend/scripts/create_mock_users.sql` - Database setup
- `src/api/auth.js` - Mock login logic
- `src/context/AuthContext.js` - Mock session handling
- `src/pages/auth/Login.js` - Login UI

## 🔄 Adding More Mock Accounts

1. Add to `backend/config.py` MOCK_ACCOUNTS dict
2. Add email to `src/api/auth.js` MOCK_ACCOUNTS array  
3. Run SQL to insert into users table with matching ID
4. Restart backend server
5. Test login with new credentials
