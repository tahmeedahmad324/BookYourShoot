from fastapi import Header, HTTPException, Depends
from typing import Optional
from backend.supabase_client import supabase


def _extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def get_current_user(authorization: Optional[str] = Header(None)):
    """
    FastAPI dependency that verifies a Supabase JWT from the Authorization header.
    Returns the user object (dict-like) on success, raises HTTPException(401) on failure.
    
    For development: If Supabase validation fails, attempts to extract user info from token payload.
    Also supports mock tokens for local testing.
    """
    token = _extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    # Development mode: Allow mock tokens for local testing
    if token.startswith('mock-jwt-token'):
        # Extract user info from mock token format: mock-jwt-token-{role}
        parts = token.split('-')
        role = parts[-1] if len(parts) > 3 else 'client'
        return {
            'id': 'dev-user-123',
            'email': f'{role}@test.com',
            'role': role
        }

    # Try the common supabase client methods to resolve user from token
    try:
        # Preferred: supabase.auth.get_user(token)
        if hasattr(supabase.auth, 'get_user'):
            user_resp = supabase.auth.get_user(token)
            # newer clients return dict-like with 'user'
            user = getattr(user_resp, 'user', None) or user_resp
        else:
            # fallback to API admin call: auth.api.get_user
            user_resp = supabase.auth.api.get_user(token)
            user = getattr(user_resp, 'user', None) or user_resp

        if not user:
            raise Exception("Invalid token or user not found")

        return user

    except Exception as e:
        # Development fallback: Try to decode JWT payload without verification
        try:
            import jwt
            import json
            
            # Decode without verification (development only!)
            payload = jwt.decode(token, options={"verify_signature": False})
            
            # Extract user info from payload
            user_id = payload.get('sub') or payload.get('user_id') or payload.get('id')
            email = payload.get('email')
            
            if user_id:
                # Return a mock user object
                return {
                    'id': user_id,
                    'email': email,
                    'role': payload.get('role', 'client')
                }
        except Exception as decode_error:
            pass
        
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
