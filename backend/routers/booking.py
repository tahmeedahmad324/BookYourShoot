from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.supabase_client import supabase
from backend.auth import get_current_user

router = APIRouter(prefix="/bookings", tags=["Booking"])


class CreateBookingRequest(BaseModel):
    photographer_id: str  # This is the photographer_profile.id (UUID)
    event_date: str
    event_time: str = None
    location: str = None
    event_type: str = None
    notes: str = None
    price: float = None


@router.post("/")
def create_booking(payload: CreateBookingRequest, current_user: dict = Depends(get_current_user)):
    """Create a new booking request"""
    try:
        # Extract user id from verified user object
        user_id = None
        if isinstance(current_user, dict):
            user_id = current_user.get("id") or current_user.get("sub")
        else:
            user_id = getattr(current_user, 'id', None)

        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Verify photographer exists
        photographer = supabase.table('photographer_profile').select('id').eq('id', payload.photographer_id).limit(1).execute()
        if not photographer.data:
            raise HTTPException(status_code=404, detail="Photographer not found")

        booking = {
            "client_id": user_id,
            "photographer_id": payload.photographer_id,  # References photographer_profile.id
            "event_date": payload.event_date,
            "location": payload.location,
            "event_type": payload.event_type,
            "notes": payload.notes,
            "price": payload.price,
            "status": "requested"  # Uses booking_status enum
        }

        resp = supabase.table('booking').insert(booking).execute()
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
def list_bookings(role: str = "client", current_user: dict = Depends(get_current_user)):
    """List bookings for current user (as client or photographer)"""
    try:
        # Determine user id from current_user
        user_id = None
        if isinstance(current_user, dict):
            user_id = current_user.get("id") or current_user.get("sub")
        else:
            user_id = getattr(current_user, 'id', None)

        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        if role == 'client':
            # Get bookings where user is the client
            resp = supabase.table('booking').select(
                '*, photographer_profile!booking_photographer_id_fkey(*, users!photographer_profile_user_id_fkey(full_name, email, phone, city))'
            ).eq('client_id', user_id).order('created_at', desc=True).execute()
        else:
            # Get photographer's profile id first
            photographer = supabase.table('photographer_profile').select('id').eq('user_id', user_id).limit(1).execute()
            if not photographer.data:
                return {"success": True, "data": []}  # User is not a photographer
            
            photographer_id = photographer.data[0]['id']
            
            # Get bookings where user is the photographer
            resp = supabase.table('booking').select(
                '*, users!booking_client_id_fkey(full_name, email, phone, city)'
            ).eq('photographer_id', photographer_id).order('created_at', desc=True).execute()

        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/{booking_id}")
def get_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Get detailed booking information"""
    try:
        user_id = None
        if isinstance(current_user, dict):
            user_id = current_user.get("id") or current_user.get("sub")
        else:
            user_id = getattr(current_user, 'id', None)

        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Get booking with joined data
        resp = supabase.table('booking').select(
            '''
            *,
            client:users!booking_client_id_fkey(*),
            photographer_profile!booking_photographer_id_fkey(
                *,
                users!photographer_profile_user_id_fkey(*)
            )
            '''
        ).eq('id', booking_id).limit(1).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        booking = resp.data[0]
        
        # Verify user has access to this booking
        photographer_user_id = booking.get('photographer_profile', {}).get('user_id')
        if booking['client_id'] != user_id and photographer_user_id != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized to view this booking")
        
        return {"success": True, "data": booking}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


class UpdateBookingStatusRequest(BaseModel):
    status: str  # requested, confirmed, cancelled, completed, rejected


@router.put("/{booking_id}/status")
def update_booking_status(booking_id: str, payload: UpdateBookingStatusRequest, current_user: dict = Depends(get_current_user)):
    """Update booking status (photographer or client can update based on status)"""
    try:
        user_id = None
        if isinstance(current_user, dict):
            user_id = current_user.get("id") or current_user.get("sub")
        else:
            user_id = getattr(current_user, 'id', None)

        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Validate status is a valid enum value
        valid_statuses = ['requested', 'confirmed', 'cancelled', 'completed', 'rejected']
        if payload.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

        # Get booking to verify ownership
        booking = supabase.table('booking').select('*, photographer_profile!booking_photographer_id_fkey(user_id)').eq('id', booking_id).limit(1).execute()
        if not booking.data:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        booking_data = booking.data[0]
        photographer_user_id = booking_data.get('photographer_profile', {}).get('user_id')
        
        # Verify user has permission to update
        is_client = booking_data['client_id'] == user_id
        is_photographer = photographer_user_id == user_id
        
        if not (is_client or is_photographer):
            raise HTTPException(status_code=403, detail="Unauthorized to update this booking")

        # Update status
        resp = supabase.table('booking').update({'status': payload.status}).eq('id', booking_id).execute()
        return {"success": True, "data": resp.data}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

