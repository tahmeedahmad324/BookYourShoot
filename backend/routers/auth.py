from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.supabase_client import supabase

router = APIRouter(prefix="/auth", tags=["Authentication"])


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
    otp: str
    full_name: str
    phone: str
    city: str


@router.post("/register")
def register(payload: RegisterRequest):
    try:
        # Verify OTP and create session
        response = supabase.auth.verify_otp({
            "email": payload.email,
            "token": payload.otp,
            "type": "email"
        })

        if response.session is None or response.user is None:
            raise HTTPException(status_code=400, detail="Invalid OTP code. Please check and try again.")

        user_id = response.user.id

        # Check if user already exists
        existing_user = supabase.table("users").select("*").eq("id", user_id).execute()
        
        if not existing_user.data:
            # Insert user into our users table
            supabase.table("users").insert({
                "id": user_id,
                "email": payload.email,
                "full_name": payload.full_name,
                "phone": payload.phone,
                "city": payload.city,
                "role": "client"
            }).execute()

        return {"message": "User registered successfully.", "access_token": response.session.access_token, "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")


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
