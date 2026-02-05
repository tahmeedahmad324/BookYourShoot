from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from backend.supabase_client import supabase
from backend.auth import get_current_user
from backend.services.reminder_service import reminder_service
from backend.services.optimization_service import booking_optimizer
from backend.services.photographer_data_service import photographer_data_engine
from backend.services.notification_service import notification_service
from backend.services.email_service import email_service

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
            'status', ['requested', 'confirmed', 'paid']
        ).limit(1).execute()
        
        if existing_booking.data:
            raise HTTPException(
                status_code=409, 
                detail="Photographer already has a booking on this date (double booking prevented)"
            )

        # Calculate financial splits (100% upfront payment, held in escrow)
        # Client pays full amount, released to photographer after work completion
        total_amount = payload.price if payload.price else 0
        platform_fee = total_amount * 0.10  # 10% platform fee
        photographer_earning = total_amount * 0.90  # 90% goes to photographer

        booking = {
            "client_id": user_id,
            "photographer_id": payload.photographer_id,  # References photographer_profile.id
            "event_date": payload.event_date,
            "location": payload.location,
            "event_type": payload.event_type,
            "notes": payload.notes,
            "price": payload.price,
            "advance_payment": total_amount,  # Full payment upfront
            "remaining_payment": 0,  # No remaining payment
            "platform_fee": platform_fee,
            "photographer_earning": photographer_earning,
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
    status: str  # requested, confirmed, cancelled, completed, rejected, paid


@router.put("/{booking_id}/status")
def update_booking_status(booking_id: str, payload: UpdateBookingStatusRequest, current_user: dict = Depends(get_current_user)):
    """
    MODULE 4: Update booking status with workflow validation
    
    Status Transition Flow:
    REQUESTED → CONFIRMED (photographer accepts) → PAID (client pays) → COMPLETED (event done)
    
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

        # Valid status transitions - Use 'confirmed' consistently (not 'accepted')
        valid_statuses = ['requested', 'confirmed', 'paid', 'completed', 'cancelled', 'rejected']
        
        # Map 'accepted' to 'confirmed' for backward compatibility
        status_to_set = payload.status
        if payload.status == 'accepted':
            status_to_set = 'confirmed'
        
        if status_to_set not in valid_statuses:
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

        # Workflow validation - using 'confirmed' consistently
        allowed_transitions = {
            'requested': ['confirmed', 'rejected', 'cancelled'],
            'confirmed': ['paid', 'cancelled'],
            'paid': ['completed', 'cancelled'],
            'completed': [],  # Terminal state
            'cancelled': [],  # Terminal state
            'rejected': [],   # Terminal state
        }
        
        # Check if transition is allowed
        if current_status in allowed_transitions:
            if status_to_set not in allowed_transitions[current_status] and status_to_set != current_status:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid status transition: {current_status} → {status_to_set}. " +
                           f"Allowed transitions: {', '.join(allowed_transitions[current_status]) or 'none (terminal state)'}"
                )
        
        # Role-based permission checks
        if status_to_set == 'confirmed' and not is_photographer:
            raise HTTPException(status_code=403, detail="Only photographer can confirm booking")
        
        if status_to_set == 'rejected' and not is_photographer:
            raise HTTPException(status_code=403, detail="Only photographer can reject booking")
        
        if status_to_set == 'paid' and not is_client:
            raise HTTPException(status_code=403, detail="Only client can mark booking as paid")
        
        if status_to_set == 'completed' and not is_photographer:
            raise HTTPException(status_code=403, detail="Only photographer can mark booking as completed")

        # Update status (use status_to_set which normalizes 'accepted' to 'confirmed')
        resp = supabase.table('booking').update({'status': status_to_set}).eq('id', booking_id).execute()
        
        return {
            "success": True,
            "data": resp.data,
            "message": f"Booking status updated: {current_status} → {status_to_set}",
            "workflow": {
                "previous_status": current_status,
                "new_status": status_to_set,
                "next_allowed_transitions": allowed_transitions.get(status_to_set, [])
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


# ============ WORK COMPLETION ENDPOINT ============

class WorkCompletedRequest(BaseModel):
    """Request model for marking work as completed"""
    notes: Optional[str] = None  # Optional notes from photographer


@router.post("/{booking_id}/work-completed")
async def mark_work_completed(
    booking_id: str, 
    payload: WorkCompletedRequest = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark booking work as completed by photographer.
    
    This endpoint:
    1. Updates booking status to 'work_completed'
    2. Notifies client that work is done
    3. Triggers client to pay remaining 50%
    4. Sends email to client with payment link
    
    Flow:
    - Photographer finishes work → calls this endpoint
    - Client receives notification to pay remaining 50%
    - After remaining payment → funds go to escrow
    - After 7 days → escrow released to photographer
    """
    try:
        # Get user ID from token
        user_id = None
        if isinstance(current_user, dict):
            user_id = current_user.get("id") or current_user.get("sub")
        else:
            user_id = getattr(current_user, 'id', None)

        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get booking with all related data
        booking = supabase.table('booking').select(
            '*, photographer_profile!booking_photographer_id_fkey(user_id, business_name)'
        ).eq('id', booking_id).limit(1).execute()
        
        if not booking.data:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        booking_data = booking.data[0]
        
        # Verify user is the photographer
        photographer_profile = booking_data.get('photographer_profile', {})
        photographer_user_id = photographer_profile.get('user_id')
        
        if photographer_user_id != user_id:
            raise HTTPException(status_code=403, detail="Only the assigned photographer can mark work as completed")
        
        # Check booking is in valid state (must be confirmed with advance paid)
        current_status = booking_data.get('status', '')
        advance_paid = booking_data.get('advance_paid', False)
        
        if current_status == 'completed' or current_status == 'work_completed':
            raise HTTPException(status_code=400, detail="Work already marked as completed")
        
        if current_status not in ['confirmed', 'paid', 'in_progress']:
            raise HTTPException(status_code=400, detail=f"Cannot complete work. Booking status is: {current_status}")
        
        if not advance_paid:
            raise HTTPException(status_code=400, detail="Cannot complete work. Advance payment not received yet.")
        
        # Get booking details for notifications
        client_id = booking_data.get('client_id')
        total_price = booking_data.get('price', 0) or 0
        advance_amount = booking_data.get('advance_paid', 0) or total_price * 0.5
        remaining_amount = total_price - float(advance_amount)
        photographer_name = photographer_profile.get('business_name', 'Photographer')
        service_type = booking_data.get('service_type') or booking_data.get('event_type', 'Photography Service')
        event_date = booking_data.get('event_date', '')
        
        # Get client email for notifications
        client = supabase.table('users').select('email, full_name').eq('id', client_id).limit(1).execute()
        client_email = client.data[0].get('email') if client.data else None
        client_name = client.data[0].get('full_name', 'Client') if client.data else 'Client'
        
        # Update booking status
        from datetime import datetime
        update_data = {
            'status': 'work_completed',
            'completed_at': datetime.now().isoformat(),
        }
        
        resp = supabase.table('booking').update(update_data).eq('id', booking_id).execute()
        
        # Send notification to client about work completion
        notification_service.notify_work_completed(
            client_id=client_id,
            photographer_id=user_id,
            booking_id=booking_id,
            remaining_amount=remaining_amount,
            photographer_name=photographer_name,
            service_type=service_type
        )
        
        # Send email to client with remaining payment details
        if client_email:
            try:
                email_service.send_remaining_payment_due(
                    client_email=client_email,
                    client_name=client_name,
                    photographer_name=photographer_name,
                    remaining_amount=remaining_amount,
                    service_type=service_type,
                    booking_id=booking_id,
                    event_date=event_date
                )
            except Exception as e:
                print(f"Warning: Failed to send work completion email: {e}")
        
        return {
            "success": True,
            "message": "Work marked as completed! Client has been notified to pay the remaining amount.",
            "data": {
                "booking_id": booking_id,
                "status": "work_completed",
                "remaining_amount": remaining_amount,
                "client_notified": True,
                "email_sent": client_email is not None
            },
            "next_steps": [
                "Client will receive notification to pay remaining Rs. {:,.0f}".format(remaining_amount),
                "After client pays, funds will be held in escrow for 7 days",
                "After 7 days, funds will be released to your available balance"
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ PAYMENT COMPLETION ENDPOINTS ============

class PaymentCompleteRequest(BaseModel):
    paymentType: str  # "advance" or "remaining"
    amount: float


@router.post("/{booking_id}/payment-complete")
def mark_payment_complete(
    booking_id: str, 
    payload: PaymentCompleteRequest, 
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a payment as complete for a booking.
    
    Payment Types:
    - "advance": 50% advance payment (confirms booking)
    - "remaining": Final 50% payment (after work completion)
    
    Updates:
    - advance_paid / remaining_paid amounts
    - payment_status field
    - Booking status if fully paid
    - Sends notifications to both parties
    """
    try:
        user_id = None
        if isinstance(current_user, dict):
            user_id = current_user.get("id") or current_user.get("sub")
        else:
            user_id = getattr(current_user, 'id', None)

        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get booking with photographer details
        booking = supabase.table('booking').select(
            '*, photographer_profile!booking_photographer_id_fkey(user_id)'
        ).eq('id', booking_id).limit(1).execute()
        
        if not booking.data:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        booking_data = booking.data[0]
        
        # Verify user is the client
        if booking_data['client_id'] != user_id:
            raise HTTPException(status_code=403, detail="Only booking client can mark payment complete")
        
        # Get current payment amounts
        current_advance = booking_data.get('advance_paid', 0) or 0
        current_remaining = booking_data.get('remaining_paid', 0) or 0
        total_price = booking_data.get('price', 0) or 0
        photographer_user_id = booking_data.get('photographer_profile', {}).get('user_id')
        
        # Update based on payment type
        update_data = {}
        
        if payload.paymentType == "advance":
            update_data['advance_paid'] = payload.amount
            update_data['payment_status'] = 'advance_paid'
            update_data['status'] = 'confirmed'  # Confirm booking when advance paid
            
            # Notify about advance payment
            notification_service.notify_advance_payment_received(
                client_id=user_id,
                photographer_id=photographer_user_id or booking_data.get('photographer_id'),
                booking_id=booking_id,
                advance_amount=payload.amount,
                remaining_amount=total_price - payload.amount,
                photographer_name=booking_data.get('photographer_name', 'Photographer'),
                service_type=booking_data.get('event_type', 'Photography Service'),
                date=booking_data.get('event_date', '')
            )
        
        elif payload.paymentType == "remaining":
            update_data['remaining_paid'] = payload.amount
            new_total_paid = current_advance + payload.amount
            
            # Check if fully paid
            if new_total_paid >= total_price:
                update_data['payment_status'] = 'fully_paid'
            else:
                update_data['payment_status'] = 'partially_paid'
            
            # Calculate platform fee (10%) and photographer earnings
            platform_fee = total_price * 0.10
            photographer_earnings = total_price - platform_fee
            
            # Notify about remaining payment received
            notification_service.notify_remaining_payment_received(
                client_id=user_id,
                photographer_id=photographer_user_id or booking_data.get('photographer_id'),
                booking_id=booking_id,
                remaining_amount=payload.amount,
                total_amount=total_price,
                photographer_earnings=photographer_earnings,
                platform_fee=platform_fee
            )
        
        # Update booking
        resp = supabase.table('booking').update(update_data).eq('id', booking_id).execute()
        
        return {
            "success": True,
            "data": resp.data,
            "message": f"Payment recorded: {payload.paymentType} - Rs. {payload.amount}",
            "payment_status": update_data.get('payment_status', 'unknown'),
            "notifications_sent": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{booking_id}/cancel")
def cancel_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    """
    Cancel booking and process refund based on cancellation policy:
    - 15+ days before: 100% refund
    - 7-14 days before: 50% refund
    - Less than 7 days: No refund
    """
    try:
        from backend.services.escrow_service import escrow_service, CancellationPolicy
        
        user_id = None
        if isinstance(current_user, dict):
            user_id = current_user.get("id") or current_user.get("sub")
        else:
            user_id = getattr(current_user, 'id', None)

        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get booking
        booking = supabase.table('booking').select(
            '*, photographer_profile!booking_photographer_id_fkey(user_id)'
        ).eq('id', booking_id).limit(1).execute()
        
        if not booking.data:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        booking_data = booking.data[0]
        
        # Verify user is the client
        if booking_data['client_id'] != user_id:
            raise HTTPException(status_code=403, detail="Only booking client can cancel booking")
        
        # Check if booking can be cancelled
        current_status = booking_data.get('status', '')
        if current_status in ['cancelled', 'completed', 'rejected']:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot cancel booking with status '{current_status}'"
            )
        
        # Calculate refund based on policy
        event_date = booking_data.get('event_date', '')
        total_amount = booking_data.get('price', 0) or 0
        advance_paid = booking_data.get('advance_paid', 0) or 0
        
        from datetime import datetime
        refund_info = CancellationPolicy.calculate_refund(
            booking_date=event_date,
            cancellation_date=datetime.now().isoformat(),
            total_amount=advance_paid if advance_paid > 0 else total_amount
        )
        
        # Update booking status to cancelled
        resp = supabase.table('booking').update({
            'status': 'cancelled',
            'cancellation_reason': 'Client cancelled',
            'refund_amount': refund_info['client_refund'],
            'photographer_compensation': refund_info['photographer_payment']
        }).eq('id', booking_id).execute()
        
        # TODO: Process actual refund through payment gateway
        
        return {
            "success": True,
            "data": resp.data,
            "message": "Booking cancelled successfully",
            "refund_info": {
                "client_refund": refund_info['client_refund'],
                "photographer_payment": refund_info['photographer_payment'],
                "policy": refund_info['policy'],
                "refund_percentage": (refund_info['client_refund'] / (advance_paid if advance_paid > 0 else total_amount) * 100) if (advance_paid or total_amount) > 0 else 0
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
