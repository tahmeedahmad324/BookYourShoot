# Authentication System Overview

## Current Implementation: Password-Based Authentication

BookYourShoot uses **Supabase Authentication** with email/password credentials for secure user authentication.

## Architecture

### Frontend (`src/`)
- **AuthContext** (`src/context/AuthContext.js`): Global authentication state management
  - Listens to Supabase `onAuthStateChange` events
  - Automatically fetches user profile when session established
  - Provides `login()`, `logout()`, `getToken()` methods
  
- **API Client** (`src/services/api.js`): Centralized Axios instance
  - Auto-attaches Supabase JWT to all requests via interceptor
  - Handles token refresh on 401 errors
  
- **Auth API** (`src/api/auth.js`): Authentication functions
  - `registerWithPassword(userData)`: Creates Supabase auth user + saves profile
  - `loginWithPassword(email, password)`: Authenticates user with Supabase

### Backend (`backend/`)
- **Auth Dependency** (`backend/auth.py`): `get_current_user()`
  - Validates Supabase JWT from `Authorization: Bearer <token>` header
  - Fetches user role from database
  - Returns: `{'id': str, 'email': str, 'role': str, ...}`
  
- **Auth Router** (`backend/routers/auth.py`):
  - `GET /api/auth/check-email`: Check if email exists
  - `POST /api/auth/register`: Save user profile to database after Supabase signup

## Registration Flow

```
User fills form → Frontend: supabase.auth.signUp({email, password})
                           ↓
                  Get user_id from response
                           ↓
                  POST /api/auth/register {user_id, email, full_name, phone, city, role}
                           ↓
                  Backend saves to users table
                           ↓
                  Redirect to dashboard (or CNIC for photographers)
```

### Code Example
```javascript
// Frontend: src/api/auth.js
export const registerWithPassword = async (userData) => {
  // Create Supabase auth user with password
  const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
  });
  
  // Save profile to our database
  const response = await api.post('/api/auth/register', {
    user_id: data.user.id,
    email: userData.email,
    full_name: userData.full_name,
    phone: userData.phone,
    city: userData.city,
    role: userData.role
  });
  
  return response.data;
};
```

## Login Flow

```
User enters credentials → Frontend: supabase.auth.signInWithPassword({email, password})
                                   ↓
                         Supabase validates credentials
                                   ↓
                         Session established (JWT stored in localStorage)
                                   ↓
                         AuthContext.onAuthStateChange triggered
                                   ↓
                         Fetch user profile from database
                                   ↓
                         Redirect to role-based dashboard
```

### Code Example
```javascript
// Frontend: src/api/auth.js
export const loginWithPassword = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  
  if (error) throw error;
  
  return {
    access_token: data.session.access_token,
    user_id: data.user.id,
    user: data.user
  };
};
```

## Session Management

- **Storage**: Supabase stores JWT in browser localStorage
- **Persistence**: Sessions persist across page refreshes
- **Refresh**: Supabase auto-refreshes tokens before expiry
- **Logout**: `supabase.auth.signOut()` clears session

## Authorization

Protected API endpoints use `get_current_user` dependency:

```python
# Backend: backend/routers/example.py
from backend.auth import get_current_user

@router.get("/protected")
def protected_route(current_user: dict = Depends(get_current_user)):
    # current_user = {'id': str, 'email': str, 'role': str}
    return {"message": f"Hello {current_user['email']}"}
```

## Role-Based Access Control

Three roles: `client`, `photographer`, `admin`

- **Client**: Book photographers, manage bookings
- **Photographer**: Accept jobs, manage portfolio, receive payouts
- **Admin**: Manage users, handle disputes, view analytics

Role is stored in `users.role` column and returned by `get_current_user`.

## Password Requirements

Enforced via frontend validation (yup schema):
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&#)

## Security Features

1. **JWT Validation**: Backend validates Supabase JWT on every request
2. **Email Uniqueness**: Checked before registration
3. **Password Hashing**: Handled by Supabase (bcrypt)
4. **Token Refresh**: Automatic via Supabase client
5. **CORS**: Only localhost:3000 and localhost:3001 allowed
6. **Role Verification**: Backend fetches role from database, not JWT claims

## Development Mode

`DEV_MODE` flag in `backend/config.py` enables mock tokens for testing:
- `mock-jwt-token-client`
- `mock-jwt-token-photographer`
- `mock-jwt-token-admin`

**Production**: Set `DEV_MODE = False` to disable mock tokens.

## Environment Variables

### Frontend (`.env`)
```env
REACT_APP_SUPABASE_URL=your-project-url
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_API_URL=http://localhost:8000
```

### Backend (`backend/.env`)
```env
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_KEY=your-service-key
API_URL=http://localhost:8000
```

## Testing Authentication

### Test Registration
1. Start backend: `.\start-backend.ps1`
2. Start frontend: `.\start-app.ps1`
3. Navigate to http://localhost:3000/register
4. Fill form with valid data
5. Verify redirect to dashboard

### Test Login
1. Navigate to http://localhost:3000/login
2. Enter registered email/password
3. Verify redirect to dashboard
4. Check browser localStorage for Supabase session

### Test Protected Routes
```javascript
// Should auto-attach token via axios interceptor
const response = await api.get('/api/bookings');
```

## Troubleshooting

### "Token has expired or is invalid"
- Check Supabase session in localStorage
- Try logging out and back in
- Verify backend has correct SUPABASE_URL

### "User not found"
- Profile may not exist in users table
- Check Supabase auth user is created
- Verify `/api/auth/register` was called

### "Invalid credentials"
- Verify email/password are correct
- Check Supabase Dashboard → Authentication → Users

### CORS errors
- Verify backend CORS allows frontend origin
- Check frontend API_URL matches backend port (8000)

## Migration from OTP Auth

Previous implementation used OTP-based authentication. Changes made:
1. Replaced `sendOTP()` → `registerWithPassword()` / `loginWithPassword()`
2. Updated Login.js to use password field instead of OTP input
3. Updated Register.js to collect password during registration
4. Backend `/api/auth/register` unchanged (still accepts user_id)
5. Removed OTP verification page from normal flow

Legacy OTP endpoints still exist but are unused:
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/login` (OTP login)
