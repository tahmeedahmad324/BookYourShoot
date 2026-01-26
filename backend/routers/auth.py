from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from backend.supabase_client import supabase
from backend.config import MOCK_ACCOUNTS

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/check-email")
def check_email_exists(email: str = Query(..., description="Email to check")):
    """
    Check if an email is already registered in the system
    Returns: {"exists": true/false}
    """
    try:
        # Check if user exists in our database
        result = supabase.table("users").select("id").eq("email", email.lower()).limit(1).execute()
        
        return {
            "exists": bool(result.data and len(result.data) > 0),
            "email": email
        }
    except Exception as e:
        # On error, return false to allow registration to proceed
        print(f"Error checking email: {str(e)}")
        return {"exists": False, "email": email}


class SignupRequest(BaseModel):
    email: str
    full_name: str
    phone: str
    city: str


@router.post("/signup")
def signup(payload: SignupRequest):
    try:
        # Use sign_in_with_otp which sends a 6-digit OTP code
        response = supabase.auth.sign_in_with_otp({
            "email": payload.email,
            "options": {
                "should_create_user": True,
            }
        })

        # Store user metadata temporarily in session storage (frontend will send this during verification)
        return {
            "message": "OTP sent to email. Please check your inbox and enter the 6-digit code."
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class SendOtpRequest(BaseModel):
    email: str


@router.post("/send-otp")
def send_otp(payload: SendOtpRequest):
    try:
        # Use sign_in_with_otp which sends a 6-digit OTP code
        # This works for both new users (creates account) and existing users (login)
        response = supabase.auth.sign_in_with_otp({
            "email": payload.email,
            "options": {
                "should_create_user": True,  # Allow signup via OTP
            }
        })

        # sign_in_with_otp doesn't return user immediately (user is created after OTP verification)
        return {"message": "OTP sent to email. Please check your inbox."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class VerifyOtpRequest(BaseModel):
    email: str
    otp: str
    full_name: str
    phone: str
    city: str


@router.post("/verify-otp")
def verify_otp(payload: VerifyOtpRequest):
    try:
        # Step 1: Verify OTP with Supabase
        response = supabase.auth.verify_otp({
            "email": payload.email,
            "token": payload.otp,
            "type": "email"  # Specify it's an email OTP
        })

        if response.session is None or response.user is None:
            raise HTTPException(status_code=400, detail="Invalid OTP code. Please check and try again.")

        user_id = response.user.id

        # Step 2: Check if user already exists in our database
        existing_user = supabase.table("users").select("*").eq("id", user_id).execute()
        
        if not existing_user.data:
            # Insert new user into our database
            supabase.table("users").insert({
                "id": user_id,
                "email": payload.email,
                "full_name": payload.full_name,
                "phone": payload.phone,
                "city": payload.city,
                "role": "client"   # default
            }).execute()

        return {
            "message": "OTP verified successfully.",
            "access_token": response.session.access_token,
            "user_id": user_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")


class RegisterRequest(BaseModel):
    email: str
    user_id: str  # Supabase auth user ID (from frontend after OTP verification)
    full_name: str
    phone: str
    city: str
    role: str  # Required: 'client', 'photographer', or 'admin'


@router.post("/register")
def register(payload: RegisterRequest):
    """
    Complete user registration after OTP verification.
    Frontend verifies OTP with Supabase, then calls this with user_id to save profile.
    """
    try:
        print(f"Registration attempt for email: {payload.email}, user_id: {payload.user_id}")
        
        # Validate role
        valid_roles = ['client', 'photographer', 'admin']
        if payload.role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
        
        # Check if user already exists
        existing_user = supabase.table("users").select("*").eq("id", payload.user_id).execute()
        
        if existing_user.data and len(existing_user.data) > 0:
            print(f"User already exists in database")
            return {
                "message": "User already registered.", 
                "user_id": existing_user.data[0]['id']
            }
        
        # Create new user in our database
        print(f"Creating new user in database with role: {payload.role}")
        supabase.table("users").insert({
            "id": payload.user_id,
            "email": payload.email,
            "full_name": payload.full_name,
            "phone": payload.phone,
            "city": payload.city,
            "role": payload.role
        }).execute()
        
        print(f"User created successfully")
        return {
            "message": "User registered successfully.", 
            "user_id": payload.user_id
        }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")


class MockLoginRequest(BaseModel):
    email: str
    password: str


@router.post("/mock-login")
def mock_login(payload: MockLoginRequest):
    """
    Mock login for testing - bypasses Supabase auth and rate limits.
    Only works with predefined test accounts.
    """
    try:
        email = payload.email.lower()
        
        # Check if this is a mock account
        if email not in MOCK_ACCOUNTS:
            raise HTTPException(status_code=401, detail="Invalid credentials. This endpoint only accepts test accounts.")
        
        mock_account = MOCK_ACCOUNTS[email]
        
        # Verify password
        if payload.password != mock_account["password"]:
            raise HTTPException(status_code=401, detail="Invalid password")
        
        # Return mock session data (frontend will handle it like a real session)
        return {
            "message": "Mock login successful",
            "user": mock_account,
            "is_mock": True
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Login failed: {str(e)}")


class LoginRequest(BaseModel):
    email: str
    otp: str


@router.post("/login")
def login(payload: LoginRequest):
    try:
        response = supabase.auth.verify_otp({
            "email": payload.email,
            "token": payload.otp,
            "type": "email"
        })

        if response.session is None or response.user is None:
            raise HTTPException(status_code=400, detail="Invalid OTP code. Please check and try again.")

        return {"message": "Login successful", "access_token": response.session.access_token, "user_id": response.user.id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Login failed: {str(e)}")
