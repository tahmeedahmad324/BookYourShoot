# Console Login Guide - BookYourShoot

## Quick Login from Browser Console

Use this guide to manually authenticate in the browser console for testing chat and other features.

---

## 🔵 Login as CLIENT

Open browser console (F12) and paste:

```javascript
// CLIENT LOGIN
localStorage.setItem('token', 'mock-jwt-token-client');
localStorage.setItem('userId', '257f9b67-99fa-44ce-ae67-6229c36380b5');
localStorage.setItem('userRole', 'client');
localStorage.setItem('userName', 'Mock Client');
localStorage.setItem('mock_user', JSON.stringify({
  id: '257f9b67-99fa-44ce-ae67-6229c36380b5',
  email: 'mock.client@test.com',
  full_name: 'Mock Client',
  role: 'client',
  is_mock: true
}));
sessionStorage.setItem('real_user', JSON.stringify({
  id: '257f9b67-99fa-44ce-ae67-6229c36380b5',
  email: 'mock.client@test.com',
  full_name: 'Mock Client',
  role: 'client'
}));
console.log('✅ Logged in as CLIENT');
window.location.href = '/client/dashboard';
```

---

## 📷 Login as PHOTOGRAPHER

Open browser console (F12) and paste:

```javascript
// PHOTOGRAPHER LOGIN
localStorage.setItem('token', 'mock-jwt-token-photographer');
localStorage.setItem('userId', '21bf398a-e012-4c4d-9b55-caeac7ec6dc7');
localStorage.setItem('userRole', 'photographer');
localStorage.setItem('userName', 'Mock Photographer');
localStorage.setItem('mock_user', JSON.stringify({
  id: '21bf398a-e012-4c4d-9b55-caeac7ec6dc7',
  email: 'mock.photographer@test.com',
  full_name: 'Mock Photographer',
  role: 'photographer',
  is_mock: true
}));
sessionStorage.setItem('real_user', JSON.stringify({
  id: '21bf398a-e012-4c4d-9b55-caeac7ec6dc7',
  email: 'mock.photographer@test.com',
  full_name: 'Mock Photographer',
  role: 'photographer'
}));
console.log('✅ Logged in as PHOTOGRAPHER');
window.location.href = '/photographer/dashboard';
```

---

## 🛡️ Login as ADMIN

Open browser console (F12) and paste:

```javascript
// ADMIN LOGIN
localStorage.setItem('token', 'mock-jwt-token-admin');
localStorage.setItem('userId', '5fb7a96b-3dd0-4d44-9631-c07a256292ee');
localStorage.setItem('userRole', 'admin');
localStorage.setItem('userName', 'Mock Admin');
localStorage.setItem('mock_user', JSON.stringify({
  id: '5fb7a96b-3dd0-4d44-9631-c07a256292ee',
  email: 'mock.admin@test.com',
  full_name: 'Mock Admin',
  role: 'admin',
  is_mock: true
}));
sessionStorage.setItem('real_user', JSON.stringify({
  id: '5fb7a96b-3dd0-4d44-9631-c07a256292ee',
  email: 'mock.admin@test.com',
  full_name: 'Mock Admin',
  role: 'admin'
}));
console.log('✅ Logged in as ADMIN');
window.location.href = '/admin/dashboard';
```

---

## 🧪 Alternative: Login with Test Email/Password

You can also use the regular login form with these credentials:

| Role | Email | Password |
|------|-------|----------|
| Client | `client@test.com` | any password (e.g., `test123`) |
| Photographer | `photographer@test.com` | any password |
| Admin | `admin@test.com` | any password |

> **Note**: Mock email accounts bypass Supabase authentication and work instantly for development.

---

## 🚪 Logout from Console

```javascript
// LOGOUT
localStorage.clear();
sessionStorage.clear();
console.log('✅ Logged out');
window.location.href = '/';
```

---

## 🔍 Check Current Login Status

```javascript
// CHECK WHO'S LOGGED IN
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');
const token = localStorage.getItem('token');
const mockUser = JSON.parse(localStorage.getItem('mock_user') || '{}');

console.log('Current User ID:', userId);
console.log('Current Role:', userRole);
console.log('Token:', token ? token.substring(0, 30) + '...' : 'None');
console.log('Mock User:', mockUser);
```

---

## 📋 Testing Chat After Login

After logging in via console:

1. **Client**: Navigate to `/client/chat`
2. **Photographer**: Navigate to `/photographer/chat`
3. **Admin**: Navigate to `/admin/dashboard`

Or just click the **Messages** link in the dashboard.

---

## 🔧 Troubleshooting

### "Unauthorized" Error

If you get unauthorized errors:

1. **Check backend is running**: `http://localhost:8000/docs`
2. **Verify DEV_MODE**: Backend must have `DEV_MODE=true` in `.env`
3. **Clear storage**: Run logout script, then login again
4. **Check console logs**: Look for `🔑` emoji logs showing user ID detection

### Chat Not Loading Conversations

1. **Open console** (F12) and check for:
   - `🔑 Using userId from localStorage:` - Should show valid UUID
   - `✅ [ChatContainer] authToken available` - Token loaded successfully
   - `📥 Loading conversations` - API call started
   
2. **If token is NULL**:
   - Verify you ran the full login script (not just set token)
   - Refresh the page after login
   - Check localStorage has `token`, `userId`, `userRole`, `mock_user`

3. **If no conversations show**:
   - This is normal for new accounts
   - Test conversations are linked to bookings
   - Use mock accounts (`client@test.com` / `photographer@test.com`) which have pre-loaded data

---

## 🎯 Quick Test Workflow

**Test chat as Client talking to Photographer:**

1. **Tab 1 - Client**:
   ```javascript
   // Paste client login script
   ```
   - Navigate to Messages → Should see photographer conversations

2. **Tab 2 (Incognito) - Photographer**:
   ```javascript
   // Paste photographer login script
   ```
   - Navigate to Messages → Should see client conversations

3. **Send messages back and forth** - Should see real-time updates via WebSocket!

---

## 📝 Mock User UUIDs (For Reference)

```javascript
const MOCK_USERS = {
  client: {
    id: '257f9b67-99fa-44ce-ae67-6229c36380b5',
    email: 'mock.client@test.com',
    token: 'mock-jwt-token-client'
  },
  photographer: {
    id: '21bf398a-e012-4c4d-9b55-caeac7ec6dc7',
    email: 'mock.photographer@test.com',
    token: 'mock-jwt-token-photographer'
  },
  admin: {
    id: '5fb7a96b-3dd0-4d44-9631-c07a256292ee',
    email: 'mock.admin@test.com',
    token: 'mock-jwt-token-admin'
  }
};
```

---

## 🌐 API Testing with Mock Tokens

Use mock tokens in API requests (Postman, curl, etc.):

```bash
# Example: Get conversations as client
curl -H "Authorization: Bearer mock-jwt-token-client" \
  http://localhost:8000/api/chat/conversations

# Example: Get profile as photographer
curl -H "Authorization: Bearer mock-jwt-token-photographer" \
  http://localhost:8000/api/profile/me
```

---

## ⚙️ Backend Configuration Required

Ensure `backend/.env` has:

```env
DEV_MODE=true
```

Without this, mock tokens won't work and you'll get "Unauthorized" errors.

---

**Now try logging in via console and test the chat! 🚀**
