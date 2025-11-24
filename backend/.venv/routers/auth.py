from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup")
def signup():
    return {"msg": "signup endpoint"}

@router.post("/login")
def login():
    return {"msg": "login endpoint"}

@router.post("/send-otp")
def send_otp():
    return {"msg": "send otp"}

@router.post("/verify-otp")
def verify_otp():
    return {"msg": "verify otp"}
