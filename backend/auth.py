from fastapi import Header, HTTPException, Depends
from typing import Optional
from backend.supabase_client import supabase
from backend.config import DEV_MODE


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
    Returns the user object with role from database on success, raises HTTPException(401) on failure.
    
    Production: Validates token with Supabase and fetches user role from database.
    Development (DEV_MODE=true): Also supports mock tokens for local testing.
    """
    token = _extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    # Development mode: Allow mock tokens for local testing ONLY if DEV_MODE is enabled
    if DEV_MODE and token.startswith('mock-jwt-token'):
        # Extract user info from mock token format: mock-jwt-token-{role}
        parts = token.split('-')
        role = parts[-1] if len(parts) > 3 else 'client'
        print(f"⚠️  DEV MODE: Using mock token for role '{role}'")
        return {
            'id': 'dev-user-123',
            'email': f'{role}@test.com',
            'role': role
        }

    # Validate token with Supabase
    try:
        # Get user from Supabase using the token
        if hasattr(supabase.auth, 'get_user'):
            user_resp = supabase.auth.get_user(token)
            supabase_user = getattr(user_resp, 'user', None) or user_resp
        else:
            # Fallback for older Supabase client versions
            user_resp = supabase.auth.api.get_user(token)
            supabase_user = getattr(user_resp, 'user', None) or user_resp

        if not supabase_user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        # Extract user ID from Supabase user object
        user_id = supabase_user.id if hasattr(supabase_user, 'id') else supabase_user.get('id')
        user_email = supabase_user.email if hasattr(supabase_user, 'email') else supabase_user.get('email')
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user data in token")

        # Fetch user role and profile from our database
        try:
            db_user_resp = supabase.table("users").select("*").eq("id", user_id).single().execute()
            db_user = db_user_resp.data if db_user_resp.data else None
            
            if not db_user:
                # User authenticated with Supabase but not in our database
                raise HTTPException(status_code=403, detail="User profile not found. Please complete registration.")
            
            # Return combined user object with role from database
            return {
                'id': user_id,
                'email': user_email,
                'role': db_user.get('role', 'client'),
                'full_name': db_user.get('full_name'),
                'phone': db_user.get('phone'),
                'city': db_user.get('city')
            }
        except HTTPException:
            raise
        except Exception as db_error:
            print(f"Database error fetching user role: {str(db_error)}")
            # Fallback to basic user info if DB query fails
            return {
                'id': user_id,
                'email': user_email,
                'role': 'client'  # Default fallback
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Token validation error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
