from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from backend.supabase_client import supabase
from backend.auth import get_current_user
from backend.services.reminder_service import reminder_service
from backend.services.optimization_service import booking_optimizer
from backend.services.photographer_data_service import photographer_data_engine

router = APIRouter(prefix="/bookings", tags=["Booking"])


# ============ MODULE 3: ILP OPTIMIZATION ENDPOINTS ============

class OptimizePhotographerRequest(BaseModel):
    """Request model for photographer optimization"""
    client_city: str
    event_date: str
    max_budget: float
    gender_preference: Optional[str] = None  # 'male', 'female', or None
    specialty: Optional[str] = None  # e.g., 'Wedding', 'Portrait', etc.
    top_k: int = 1  # Number of top photographers to return


@router.post("/optimize")
def optimize_photographer_selection(
    payload: OptimizePhotographerRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    🎯 MODULE 3: CORE OPTIMIZATION ENDPOINT
    
    Uses Integer Linear Programming (ILP) to select optimal photographer(s)
    
    Decision Variable: x_i ∈ {0,1} (photographer i selected or not)
    
    Objective Function:
    Maximize: Σ (α·Rating_i - β·Cost_i - γ·TravelCost_i + δ·Experience_i) · x_i
    
    Constraints:
    - Σ x_i = top_k (select exactly k photographers)
    - Availability_i = 1 (must be available)
    - Cost_i ≤ ClientBudget (within budget)
    - Gender_i == ClientPreference (if specified)
    
    Returns:
    - Selected photographer(s) with optimization scores
    - Score breakdown for explainability (IMPORTANT for viva)
    """
    try:
        result = booking_optimizer.optimize(
            client_city=payload.client_city,
            event_date=payload.event_date,
            max_budget=payload.max_budget,
            gender_preference=payload.gender_preference,
            specialty=payload.specialty,
            top_k=payload.top_k
        )
        
        if not result['success']:
            raise HTTPException(status_code=404, detail=result['message'])
        
        return {
            "success": True,
            "data": result,
            "message": "✅ ILP optimization completed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Optimization failed: {str(e)}")


@router.post("/optimize/explain")
def explain_optimization(
    payload: OptimizePhotographerRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate detailed explanation of optimization results
    Perfect for viva demonstration - shows how ILP works
    """
    try:
        result = booking_optimizer.optimize(
            client_city=payload.client_city,
            event_date=payload.event_date,
            max_budget=payload.max_budget,
            gender_preference=payload.gender_preference,
            specialty=payload.specialty,
            top_k=payload.top_k
        )
        
        explanation = booking_optimizer.explain_optimization(result)
        
        return {
            "success": True,
            "explanation": explanation,
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/update-normalization-cache")
def update_normalization_cache(current_user: dict = Depends(get_current_user)):
    """
    Update min/max cache for attribute normalization
    Should be called periodically or when photographers are added/updated
    """
    try:
        photographer_data_engine.update_min_max_cache()
        return {
            "success": True,
            "message": "Normalization cache updated successfully",
            "cache": photographer_data_engine.min_max_cache
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ MODULE 4: BOOKING WORKFLOW ============


class CreateBookingRequest(BaseModel):
    photographer_id: str  # This is the photographer_profile.id (UUID)
    event_date: str
    event_time: str = None
    location: str = None
    event_type: str = None
    notes: str = None
    price: float = None
    optimization_score: Optional[dict] = None  # Store optimization results


@router.post("/")
def create_booking(payload: CreateBookingRequest, current_user: dict = Depends(get_current_user)):
    """
    MODULE 4: Create a new booking from optimization result
    
    This endpoint persists the optimization result into a real booking
    Status flow: REQUESTED → ACCEPTED → PAID → COMPLETED
    Implements availability locking to prevent double booking
    """
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
        photographer = supabase.table('photographer_profile').select('id, verified').eq('id', payload.photographer_id).limit(1).execute()
        if not photographer.data:
            raise HTTPException(status_code=404, detail="Photographer not found")
        
        # Check photographer is available (verified)
        if not photographer.data[0].get('verified', False):
            raise HTTPException(status_code=400, detail="Photographer is not available")
        
        # Check for double booking (availability locking)
        existing_booking = supabase.table('booking').select('id').eq(
            'photographer_id', payload.photographer_id
        ).eq(
            'event_date', payload.event_date
        ).in_(
            'status', ['requested', 'confirmed', 'accepted', 'paid']
        ).limit(1).execute()
        
        if existing_booking.data:
            raise HTTPException(
                status_code=409, 
                detail="Photographer already has a booking on this date (double booking prevented)"
            )

        booking = {
            "client_id": user_id,
            "photographer_id": payload.photographer_id,  # References photographer_profile.id
            "event_date": payload.event_date,
            "location": payload.location,
            "event_type": payload.event_type,
            "notes": payload.notes,
            "price": payload.price,
            "status": "requested"  # Initial status in workflow
        }
        
        # Store optimization metadata if provided (for tracking/explainability)
        if payload.optimization_score:
            booking['notes'] = (booking.get('notes', '') + 
                              f"\n[Optimization Score: {payload.optimization_score.get('total_score', 0):.4f}]")

        resp = supabase.table('booking').insert(booking).execute()
        
        return {
            "success": True,
            "data": resp.data,
            "message": "Booking created successfully with status: REQUESTED"
        }
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
    status: str  # requested, confirmed, cancelled, completed, rejected, accepted, paid


@router.put("/{booking_id}/status")
def update_booking_status(booking_id: str, payload: UpdateBookingStatusRequest, current_user: dict = Depends(get_current_user)):
    """
    MODULE 4: Update booking status with workflow validation
    
    Status Transition Flow:
    REQUESTED → ACCEPTED (photographer accepts) → PAID (client pays) → COMPLETED (event done)
    
    Can be cancelled at any time: → CANCELLED
    Can be rejected by photographer: REQUESTED → REJECTED
    """
    try:
        user_id = None
        if isinstance(current_user, dict):
            user_id = current_user.get("id") or current_user.get("sub")
        else:
            user_id = getattr(current_user, 'id', None)

        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Valid status transitions
        valid_statuses = ['requested', 'accepted', 'paid', 'completed', 'cancelled', 'rejected', 'confirmed']
        if payload.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

        # Get booking to verify ownership and current status
        booking = supabase.table('booking').select(
            '*, photographer_profile!booking_photographer_id_fkey(user_id)'
        ).eq('id', booking_id).limit(1).execute()
        
        if not booking.data:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        booking_data = booking.data[0]
        current_status = booking_data.get('status', 'requested')
        photographer_user_id = booking_data.get('photographer_profile', {}).get('user_id')
        
        # Verify user has permission to update
        is_client = booking_data['client_id'] == user_id
        is_photographer = photographer_user_id == user_id
        
        if not (is_client or is_photographer):
            raise HTTPException(status_code=403, detail="Unauthorized to update this booking")

        # Workflow validation
        allowed_transitions = {
            'requested': ['accepted', 'rejected', 'cancelled'],
            'accepted': ['paid', 'cancelled'],
            'paid': ['completed', 'cancelled'],
            'completed': [],  # Terminal state
            'cancelled': [],  # Terminal state
            'rejected': [],   # Terminal state
            'confirmed': ['paid', 'cancelled']  # Legacy support
        }
        
        # Check if transition is allowed
        if current_status in allowed_transitions:
            if payload.status not in allowed_transitions[current_status] and payload.status != current_status:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid status transition: {current_status} → {payload.status}. " +
                           f"Allowed transitions: {', '.join(allowed_transitions[current_status]) or 'none (terminal state)'}"
                )
        
        # Role-based permission checks
        if payload.status == 'accepted' and not is_photographer:
            raise HTTPException(status_code=403, detail="Only photographer can accept booking")
        
        if payload.status == 'rejected' and not is_photographer:
            raise HTTPException(status_code=403, detail="Only photographer can reject booking")
        
        if payload.status == 'paid' and not is_client:
            raise HTTPException(status_code=403, detail="Only client can mark booking as paid")
        
        if payload.status == 'completed' and not is_photographer:
            raise HTTPException(status_code=403, detail="Only photographer can mark booking as completed")

        # Update status
        resp = supabase.table('booking').update({'status': payload.status}).eq('id', booking_id).execute()
        
        return {
            "success": True,
            "data": resp.data,
            "message": f"Booking status updated: {current_status} → {payload.status}",
            "workflow": {
                "previous_status": current_status,
                "new_status": payload.status,
                "next_allowed_transitions": allowed_transitions.get(payload.status, [])
            }
        }
        
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

