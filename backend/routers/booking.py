from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.supabase_client import supabase

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
def create_booking(payload: CreateBookingRequest, user_id: str = None):
    try:
        # user_id should be extracted from auth middleware; accept as param for now
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
def list_bookings(role: str = "client", user_id: str = None):
    try:
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
def get_booking(booking_id: str, user_id: str = None):
    try:
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        resp = supabase.table('booking').select('*, client:users(*), photographer:photographer_profile(*)').eq('id', booking_id).limit(1).execute()
        return {"success": True, "data": resp.data[0] if resp.data else None}
    except Exception as e:
        return {"success": False, "error": str(e)}
