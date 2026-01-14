from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.supabase_client import supabase
from backend.auth import get_current_user
from backend.services.reminder_service import reminder_service

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


# ============ REMINDER ENDPOINTS ============

class ScheduleReminderRequest(BaseModel):
    booking_id: str
    booking_datetime: str
    client_id: str
    photographer_id: str
    service_type: str = "Photography Session"
    client_name: str = "Client"
    photographer_name: str = "Photographer"


@router.post("/reminders/schedule")
def schedule_booking_reminders(payload: ScheduleReminderRequest):
    """Schedule reminders for an upcoming booking"""
    try:
        scheduled = reminder_service.schedule_reminders_for_booking(
            booking_id=payload.booking_id,
            booking_datetime=payload.booking_datetime,
            client_id=payload.client_id,
            photographer_id=payload.photographer_id,
            service_type=payload.service_type,
            client_name=payload.client_name,
            photographer_name=payload.photographer_name
        )
        return {"success": True, "scheduled_reminders": scheduled}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/reminders/pending")
def get_pending_reminders(booking_id: str = None):
    """Get all pending reminders, optionally filtered by booking ID"""
    reminders = reminder_service.get_pending_reminders(booking_id)
    return {"success": True, "reminders": reminders}


@router.post("/reminders/check-and-send")
def check_and_send_reminders():
    """Check for due reminders and send them (for demo/testing)"""
    sent = reminder_service.check_and_send_due_reminders()
    return {"success": True, "sent_count": len(sent), "sent_reminders": sent}


@router.delete("/reminders/{booking_id}")
def cancel_booking_reminders(booking_id: str):
    """Cancel all pending reminders for a booking"""
    cancelled = reminder_service.cancel_reminders_for_booking(booking_id)
    return {"success": True, "cancelled_count": cancelled}


class DemoReminderRequest(BaseModel):
    booking_id: str = "DEMO-001"
    client_id: str = "client@example.com"
    photographer_id: str = "photographer@example.com"
    service_type: str = "Wedding Photography"
    reminder_type: str = "24h"  # "24h" or "2h"


@router.post("/reminders/demo")
def send_demo_reminder(payload: DemoReminderRequest):
    """Send a demo reminder immediately for testing"""
    result = reminder_service.send_demo_reminder(
        booking_id=payload.booking_id,
        client_id=payload.client_id,
        photographer_id=payload.photographer_id,
        service_type=payload.service_type,
        reminder_type=payload.reminder_type
    )
    return result

