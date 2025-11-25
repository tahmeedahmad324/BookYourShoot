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
    """
    token = _extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

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
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
