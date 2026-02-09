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
        
        # Use consistent UUIDs for mock users (valid UUID format)
        # These match the actual test users in the database
        mock_user_ids = {
            'client': '257f9b67-99fa-44ce-ae67-6229c36380b5',  # Test Client
            'photographer': '21bf398a-e012-4c4d-9b55-caeac7ec6dc7',  # Test Photographer
            'admin': '5fb7a96b-3dd0-4d44-9631-c07a256292ee'  # Test Admin
        }
        
        user_id = mock_user_ids.get(role, '00000000-0000-0000-0000-000000000001')
        
        # In DEV_MODE, ensure mock user exists in database
        try:
            existing_user = supabase.table('users').select('*').eq('id', user_id).execute()
            if not existing_user.data:
                # Create mock user in database
                mock_user = {
                    'id': user_id,
                    'email': f'mock.{role}@test.com',
                    'full_name': f'Mock {role.capitalize()}',
                    'role': role,
                    'city': 'Lahore'
                }
                supabase.table('users').insert(mock_user).execute()
                print(f"✅ Created mock {role} user in database: {user_id}")
        except Exception as e:
            # If insertion fails (e.g., user already exists), that's fine
            print(f"⚠️  Mock user creation note: {e}")
        
        print(f"⚠️  DEV MODE: Using mock token for role '{role}' (UUID: {user_id})")
        return {
            'id': user_id,
            'email': f'mock.{role}@test.com',
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
            db_user_resp = supabase.table("users").select("*").eq("id", user_id).limit(1).execute()
            db_user = db_user_resp.data[0] if db_user_resp.data and len(db_user_resp.data) > 0 else None
            
            if not db_user:
                # User authenticated with Supabase but not in our database
                # Automatically create the user record to fix this state (Self-Healing)
                print(f"⚠️  User {user_id} exists in Supabase but missing in DB. Auto-creating user record.")
                
                new_user_role = 'client'  # Default role
                
                try:
                    # Insert new user into our database
                    # Use provided metadata or defaults - safely access user_metadata
                    display_name = None
                    if hasattr(supabase_user, 'user_metadata') and supabase_user.user_metadata:
                        display_name = supabase_user.user_metadata.get('full_name')
                    if not display_name:
                         display_name = user_email.split('@')[0] if user_email else 'User'
                         
                    new_user_data = {
                        "id": user_id,
                        "email": user_email,
                        "full_name": display_name,
                        "role": new_user_role
                    }
                    
                    supabase.table("users").insert(new_user_data).execute()
                    print(f"✅ Auto-created user record for {user_email}")
                    
                    # Return the new user object
                    return {
                        'id': user_id,
                        'email': user_email,
                        'role': new_user_role,
                        'full_name': new_user_data['full_name'],
                        'phone': None,
                        'city': None
                    }
                    
                except Exception as create_error:
                    print(f"❌ Failed to auto-create user: {str(create_error)}")
                    # If auto-creation fails, we have to deny access
                    raise HTTPException(status_code=403, detail="User profile not found and auto-creation failed. Please contact support.")
            
            # User exists in database - return their data
            return {
                'id': db_user.get('id'),
                'email': db_user.get('email'),
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
