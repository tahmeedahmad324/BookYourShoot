from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.supabase_client import supabase
from backend.auth import get_current_user

router = APIRouter(prefix="/bookings", tags=["Booking"])


class CreateBookingRequest(BaseModel):
    photographer_id: str
    event_date: str
    event_time: str = None
    location: str = None
    event_type: str = None
    notes: str = None
    price: float = None


@router.post("/")
def create_booking(payload: CreateBookingRequest, current_user: dict = Depends(get_current_user)):
    try:
        # Extract user id from verified user object
        user_id = None
        if isinstance(current_user, dict):
            user_id = current_user.get("id") or current_user.get("sub")
        else:
            # supabase client can return a user-like object with .id
            user_id = getattr(current_user, 'id', None)

        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        booking = {
            "client_id": user_id,
            "photographer_id": payload.photographer_id,
            "event_date": payload.event_date,
            "location": payload.location,
            "event_type": payload.event_type,
            "notes": payload.notes,
            "price": payload.price,
            "status": "requested"
        }

        resp = supabase.table('booking').insert(booking).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
def list_bookings(role: str = "client", current_user: dict = Depends(get_current_user)):
    try:
        # determine user id from current_user
        user_id = None
        if isinstance(current_user, dict):
            user_id = current_user.get("id") or current_user.get("sub")
        else:
            user_id = getattr(current_user, 'id', None)

        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        if role == 'client':
            resp = supabase.table('booking').select('*').eq('client_id', user_id).execute()
        else:
            resp = supabase.table('booking').select('*').eq('photographer_id', user_id).execute()

        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/{booking_id}")
def get_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    try:
        user_id = None
        if isinstance(current_user, dict):
            user_id = current_user.get("id") or current_user.get("sub")
        else:
            user_id = getattr(current_user, 'id', None)

        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        resp = supabase.table('booking').select('*, client:users(*), photographer:photographer_profile(*)').eq('id', booking_id).limit(1).execute()
        return {"success": True, "data": resp.data[0] if resp.data else None}
    except Exception as e:
        return {"success": False, "error": str(e)}
