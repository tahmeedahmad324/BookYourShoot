from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase_client import supabase

router = APIRouter(prefix="/auth", tags=["Authentication"])


class SignupRequest(BaseModel):
    email: str
    full_name: str
    phone: str
    city: str


@router.post("/signup")
def signup(payload: SignupRequest):
    try:
        # Step 1: Create supabase user (this sends OTP automatically)
        response = supabase.auth.sign_up({
            "email": payload.email,
            "password": "TEMP_PASSWORD_123"   # Required even if not used
        })

        if response.user is None:
            raise HTTPException(status_code=400, detail="Error creating user.")

        # Step 2: Store metadata after OTP verification, not now!
        # So we return user_id temporarily so front-end can reuse it
        return {
            "message": "OTP sent to email.",
            "user_id_temp": response.user.id
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class SendOtpRequest(BaseModel):
    email: str


@router.post("/send-otp")
def send_otp(payload: SendOtpRequest):
    try:
        response = supabase.auth.sign_up({
            "email": payload.email,
            "password": "TEMP_PASSWORD_123"
        })

        if response.user is None:
            raise HTTPException(status_code=400, detail="Error sending OTP")

        return {"message": "OTP sent to email.", "user_id_temp": response.user.id}
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
        # Step 1: Verify OTP
        response = supabase.auth.verify_otp({
            "type": "email",
            "email": payload.email,
            "token": payload.otp
        })

        if response.session is None:
            raise HTTPException(status_code=400, detail="OTP verification failed.")

        user_id = response.user.id

        # Step 2: Insert user into our database after verification
        supabase.table("users").insert({
            "id": user_id,
            "email": payload.email,
            "full_name": payload.full_name,
            "phone": payload.phone,
            "city": payload.city,
            "role": "client"   # default
        }).execute()

        return {
            "message": "OTP verified & user created.",
            "access_token": response.session.access_token,
            "user_id": user_id
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


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
            "type": "email",
            "email": payload.email,
            "token": payload.otp
        })

        if response.session is None:
            raise HTTPException(status_code=400, detail="OTP verification failed.")

        user_id = response.user.id

        # Insert user into our users table
        supabase.table("users").insert({
            "id": user_id,
            "email": payload.email,
            "full_name": payload.full_name,
            "phone": payload.phone,
            "city": payload.city,
            "role": "client"
        }).execute()

        return {"message": "User registered.", "access_token": response.session.access_token, "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class LoginRequest(BaseModel):
    email: str
    otp: str


@router.post("/login")
def login(payload: LoginRequest):
    try:
        response = supabase.auth.verify_otp({
            "type": "email",
            "email": payload.email,
            "token": payload.otp
        })

        if response.session is None:
            raise HTTPException(status_code=400, detail="Login failed: OTP verification failed.")

        return {"message": "Login successful", "access_token": response.session.access_token, "user_id": response.user.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
