from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from backend.supabase_client import supabase
from backend.auth import get_current_user
from backend.services.escrow_service import escrow_service
import uuid

router = APIRouter(prefix="/equipment", tags=["Equipment"])


class AddEquipmentRequest(BaseModel):
    name: str
    category: str  # camera, lens, lighting, audio, accessory
    brand: Optional[str] = None
    model: Optional[str] = None
    purchase_date: Optional[str] = None
    condition: str = "good"  # excellent, good, fair, poor
    notes: Optional[str] = None


class UpdateEquipmentRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    condition: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


@router.post("/")
def add_equipment(payload: AddEquipmentRequest, current_user: dict = Depends(get_current_user)):
    """Add new equipment for photographer"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Verify user is a photographer and get photographer_profile.id
        photographer = supabase.table('photographer_profile').select('id').eq('user_id', user_id).limit(1).execute()
        if not photographer.data:
            raise HTTPException(status_code=403, detail="Only photographers can add equipment")
        
        photographer_id = photographer.data[0]['id']

        equipment = {
            "photographer_id": photographer_id,
            "name": payload.name,
            "category": payload.category,
            "brand": payload.brand,
            "model": payload.model,
            "purchase_date": payload.purchase_date,
            "condition": payload.condition,
            "notes": payload.notes,
            "is_active": True
        }

        resp = supabase.table('equipment').insert(equipment).execute()
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-equipment")
def get_my_equipment(current_user: dict = Depends(get_current_user)):
    """Get all equipment for current photographer"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Get photographer profile id
        photographer = supabase.table('photographer_profile').select('id').eq('user_id', user_id).limit(1).execute()
        if not photographer.data:
            raise HTTPException(status_code=404, detail="Photographer profile not found")
        
        photographer_id = photographer.data[0]['id']

        resp = supabase.table('equipment').select('*').eq('photographer_id', photographer_id).order('created_at', desc=True).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/photographer/{photographer_id}")
def get_photographer_equipment(photographer_id: str):
    """Get all active equipment for a specific photographer"""
    try:
        resp = supabase.table('equipment').select('*').eq('photographer_id', photographer_id).eq('is_active', True).order('category').execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/{equipment_id}")
def get_equipment(equipment_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific equipment details"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Get photographer profile id
        photographer = supabase.table('photographer_profile').select('id').eq('user_id', user_id).limit(1).execute()
        if not photographer.data:
            raise HTTPException(status_code=404, detail="Photographer profile not found")
        
        photographer_id = photographer.data[0]['id']

        resp = supabase.table('equipment').select('*').eq('id', equipment_id).limit(1).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Equipment not found")
        
        # Verify ownership
        if resp.data[0]['photographer_id'] != photographer_id:
            raise HTTPException(status_code=403, detail="Unauthorized to view this equipment")
        
        return {"success": True, "data": resp.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.put("/{equipment_id}")
def update_equipment(equipment_id: str, payload: UpdateEquipmentRequest, current_user: dict = Depends(get_current_user)):
    """Update equipment details"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Get photographer profile id
        photographer = supabase.table('photographer_profile').select('id').eq('user_id', user_id).limit(1).execute()
        if not photographer.data:
            raise HTTPException(status_code=404, detail="Photographer profile not found")
        
        photographer_id = photographer.data[0]['id']

        # Verify ownership
        equipment = supabase.table('equipment').select('*').eq('id', equipment_id).eq('photographer_id', photographer_id).limit(1).execute()
        if not equipment.data:
            raise HTTPException(status_code=404, detail="Equipment not found or unauthorized")

        updates = {}
        if payload.name is not None:
            updates['name'] = payload.name
        if payload.category is not None:
            updates['category'] = payload.category
        if payload.brand is not None:
            updates['brand'] = payload.brand
        if payload.model is not None:
            updates['model'] = payload.model
        if payload.condition is not None:
            updates['condition'] = payload.condition
        if payload.notes is not None:
            updates['notes'] = payload.notes
        if payload.is_active is not None:
            updates['is_active'] = payload.is_active

        resp = supabase.table('equipment').update(updates).eq('id', equipment_id).execute()
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{equipment_id}")
def delete_equipment(equipment_id: str, current_user: dict = Depends(get_current_user)):
    """Delete equipment"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Get photographer profile id
        photographer = supabase.table('photographer_profile').select('id').eq('user_id', user_id).limit(1).execute()
        if not photographer.data:
            raise HTTPException(status_code=404, detail="Photographer profile not found")
        
        photographer_id = photographer.data[0]['id']

        # Verify ownership
        equipment = supabase.table('equipment').select('*').eq('id', equipment_id).eq('photographer_id', photographer_id).limit(1).execute()
        if not equipment.data:
            raise HTTPException(status_code=404, detail="Equipment not found or unauthorized")

        resp = supabase.table('equipment').delete().eq('id', equipment_id).execute()
        return {"success": True, "message": "Equipment deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ================================
# RENTAL ENDPOINTS
# ================================

class CreateRentalRequest(BaseModel):
    equipment_id: str
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    notes: Optional[str] = None


class UpdateRentalStatusRequest(BaseModel):
    status: str  # approved, rejected, active, returned, cancelled
    notes: Optional[str] = None


class ReleaseDepositRequest(BaseModel):
    deduction_amount: float = 0
    reason: Optional[str] = "Equipment returned in good condition"


class DisputeRentalRequest(BaseModel):
    dispute_reason: str
    description: str


@router.get("/rentable")
def get_all_rentable_equipment(
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = 50,
    offset: int = 0
):
    """Get all equipment available for rent"""
    try:
        query = supabase.table('equipment').select(
            '*, photographer_profile!equipment_photographer_id_fkey(id, business_name, city, users!photographer_profile_user_id_fkey(full_name))'
        ).eq('available', True).eq('is_active', True).gt('rental_price_per_day', 0)
        
        if category:
            query = query.eq('category', category)
        if min_price is not None:
            query = query.gte('rental_price_per_day', min_price)
        if max_price is not None:
            query = query.lte('rental_price_per_day', max_price)
        
        resp = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        return {"success": True, "data": resp.data, "count": len(resp.data)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/{equipment_id}/availability")
def get_equipment_availability(equipment_id: str, month: Optional[int] = None, year: Optional[int] = None):
    """Get equipment availability calendar - returns blocked/booked dates"""
    try:
        # Default to current month
        now = datetime.now()
        target_month = month or now.month
        target_year = year or now.year
        
        # Get start and end of month
        if target_month == 12:
            next_month_year = target_year + 1
            next_month = 1
        else:
            next_month_year = target_year
            next_month = target_month + 1
        
        start_date = f"{target_year}-{target_month:02d}-01"
        end_date = f"{next_month_year}-{next_month:02d}-01"
        
        # Get all rentals that overlap with this month
        rentals = supabase.table('equipment_rental').select(
            'id, start_date, end_date, status, renter_id, users!equipment_rental_renter_id_fkey(full_name)'
        ).eq('equipment_id', equipment_id).in_(
            'status', ['requested', 'approved', 'active']
        ).or_(
            f'and(start_date.lte.{end_date},end_date.gte.{start_date})'
        ).execute()
        
        blocked_dates = []
        for rental in rentals.data:
            # Generate all dates in the rental period
            rental_start = datetime.strptime(rental['start_date'], '%Y-%m-%d').date()
            rental_end = datetime.strptime(rental['end_date'], '%Y-%m-%d').date()
            current = rental_start
            while current <= rental_end:
                blocked_dates.append({
                    "date": current.isoformat(),
                    "status": rental['status'],
                    "rental_id": rental['id']
                })
                current = date(current.year, current.month, current.day + 1) if current.day < 28 else (
                    date(current.year, current.month + 1, 1) if current.month < 12 else date(current.year + 1, 1, 1)
                )
        
        return {
            "success": True, 
            "equipment_id": equipment_id,
            "month": target_month,
            "year": target_year,
            "blocked_dates": blocked_dates,
            "rentals": rentals.data
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/rentals")
def create_rental_request(payload: CreateRentalRequest, current_user: dict = Depends(get_current_user)):
    """Create a new equipment rental request"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get equipment details
        equipment = supabase.table('equipment').select(
            '*, photographer_profile!equipment_photographer_id_fkey(id, user_id)'
        ).eq('id', payload.equipment_id).limit(1).execute()
        
        if not equipment.data:
            raise HTTPException(status_code=404, detail="Equipment not found")
        
        equip = equipment.data[0]
        
        if not equip.get('available') or not equip.get('is_active'):
            raise HTTPException(status_code=400, detail="Equipment is not available for rent")
        
        # Check for date conflicts
        conflicts = supabase.table('equipment_rental').select('id').eq(
            'equipment_id', payload.equipment_id
        ).in_('status', ['requested', 'approved', 'active']).or_(
            f'and(start_date.lte.{payload.end_date},end_date.gte.{payload.start_date})'
        ).execute()
        
        if conflicts.data:
            raise HTTPException(status_code=400, detail="Equipment is not available for these dates")
        
        # Calculate rental details
        start = datetime.strptime(payload.start_date, '%Y-%m-%d')
        end = datetime.strptime(payload.end_date, '%Y-%m-%d')
        total_days = (end - start).days + 1
        rental_price = equip['rental_price_per_day'] * total_days
        security_deposit = rental_price * 0.5  # 50% security deposit
        
        owner_id = equip['photographer_profile']['id']
        
        rental = {
            "equipment_id": payload.equipment_id,
            "renter_id": user_id,
            "owner_id": owner_id,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "total_days": total_days,
            "rental_price": rental_price,
            "security_deposit": security_deposit,
            "status": "requested",
            "payment_status": "pending",
            "notes": payload.notes
        }
        
        resp = supabase.table('equipment_rental').insert(rental).execute()
        
        # TODO: Send notification to equipment owner
        
        return {
            "success": True, 
            "data": resp.data[0],
            "total_amount": rental_price + security_deposit,
            "message": "Rental request submitted. Waiting for owner approval."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/rentals/my")
def get_my_rentals(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all rentals for current user (as renter)"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        query = supabase.table('equipment_rental').select(
            '*, equipment!equipment_rental_equipment_id_fkey(*, photographer_profile!equipment_photographer_id_fkey(business_name, city))'
        ).eq('renter_id', user_id)
        
        if status:
            query = query.eq('status', status)
        
        resp = query.order('created_at', desc=True).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/rentals/owner")
def get_owner_rental_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all rental requests for equipment owned by current user"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get photographer profile
        photographer = supabase.table('photographer_profile').select('id').eq('user_id', user_id).limit(1).execute()
        if not photographer.data:
            raise HTTPException(status_code=404, detail="Photographer profile not found")
        
        owner_id = photographer.data[0]['id']
        
        query = supabase.table('equipment_rental').select(
            '*, equipment!equipment_rental_equipment_id_fkey(*), users!equipment_rental_renter_id_fkey(full_name, email, phone)'
        ).eq('owner_id', owner_id)
        
        if status:
            query = query.eq('status', status)
        
        resp = query.order('created_at', desc=True).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/rentals/{rental_id}")
def get_rental_details(rental_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific rental details"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        resp = supabase.table('equipment_rental').select(
            '*, equipment!equipment_rental_equipment_id_fkey(*, photographer_profile!equipment_photographer_id_fkey(id, user_id, business_name)), users!equipment_rental_renter_id_fkey(full_name, email, phone)'
        ).eq('id', rental_id).limit(1).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Rental not found")
        
        rental = resp.data[0]
        
        # Verify access (renter or owner)
        owner_user_id = rental['equipment']['photographer_profile']['user_id']
        if user_id != rental['renter_id'] and user_id != owner_user_id:
            raise HTTPException(status_code=403, detail="Unauthorized to view this rental")
        
        return {"success": True, "data": rental}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.put("/rentals/{rental_id}/approve")
def approve_rental(rental_id: str, current_user: dict = Depends(get_current_user)):
    """Approve a rental request (owner only)"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get photographer profile
        photographer = supabase.table('photographer_profile').select('id').eq('user_id', user_id).limit(1).execute()
        if not photographer.data:
            raise HTTPException(status_code=404, detail="Photographer profile not found")
        
        owner_id = photographer.data[0]['id']
        
        # Get rental and verify ownership
        rental = supabase.table('equipment_rental').select('*').eq('id', rental_id).eq('owner_id', owner_id).limit(1).execute()
        if not rental.data:
            raise HTTPException(status_code=404, detail="Rental not found or unauthorized")
        
        if rental.data[0]['status'] != 'requested':
            raise HTTPException(status_code=400, detail=f"Cannot approve rental with status: {rental.data[0]['status']}")
        
        # Update status
        resp = supabase.table('equipment_rental').update({
            "status": "approved",
            "updated_at": datetime.now().isoformat()
        }).eq('id', rental_id).execute()
        
        # TODO: Send notification to renter about approval
        
        return {"success": True, "data": resp.data, "message": "Rental request approved"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/rentals/{rental_id}/reject")
def reject_rental(rental_id: str, payload: UpdateRentalStatusRequest, current_user: dict = Depends(get_current_user)):
    """Reject a rental request (owner only)"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get photographer profile
        photographer = supabase.table('photographer_profile').select('id').eq('user_id', user_id).limit(1).execute()
        if not photographer.data:
            raise HTTPException(status_code=404, detail="Photographer profile not found")
        
        owner_id = photographer.data[0]['id']
        
        # Get rental and verify ownership
        rental = supabase.table('equipment_rental').select('*').eq('id', rental_id).eq('owner_id', owner_id).limit(1).execute()
        if not rental.data:
            raise HTTPException(status_code=404, detail="Rental not found or unauthorized")
        
        if rental.data[0]['status'] != 'requested':
            raise HTTPException(status_code=400, detail=f"Cannot reject rental with status: {rental.data[0]['status']}")
        
        # Update status
        resp = supabase.table('equipment_rental').update({
            "status": "cancelled",
            "notes": payload.notes or "Rejected by owner",
            "updated_at": datetime.now().isoformat()
        }).eq('id', rental_id).execute()
        
        # TODO: Send notification to renter about rejection
        
        return {"success": True, "data": resp.data, "message": "Rental request rejected"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/rentals/{rental_id}/activate")
def activate_rental(rental_id: str, current_user: dict = Depends(get_current_user)):
    """Mark rental as active when equipment is picked up (owner only)"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get photographer profile
        photographer = supabase.table('photographer_profile').select('id').eq('user_id', user_id).limit(1).execute()
        if not photographer.data:
            raise HTTPException(status_code=404, detail="Photographer profile not found")
        
        owner_id = photographer.data[0]['id']
        
        # Get rental and verify ownership
        rental = supabase.table('equipment_rental').select('*').eq('id', rental_id).eq('owner_id', owner_id).limit(1).execute()
        if not rental.data:
            raise HTTPException(status_code=404, detail="Rental not found or unauthorized")
        
        if rental.data[0]['status'] != 'approved':
            raise HTTPException(status_code=400, detail="Rental must be approved before activation")
        
        if rental.data[0]['payment_status'] != 'paid':
            raise HTTPException(status_code=400, detail="Payment must be completed before activation")
        
        # Update status
        resp = supabase.table('equipment_rental').update({
            "status": "active",
            "updated_at": datetime.now().isoformat()
        }).eq('id', rental_id).execute()
        
        return {"success": True, "data": resp.data, "message": "Rental is now active"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/rentals/{rental_id}/return")
def return_equipment(
    rental_id: str, 
    payload: ReleaseDepositRequest,
    current_user: dict = Depends(get_current_user)
):
    """Mark equipment as returned and release deposit (owner only)"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get photographer profile
        photographer = supabase.table('photographer_profile').select('id').eq('user_id', user_id).limit(1).execute()
        if not photographer.data:
            raise HTTPException(status_code=404, detail="Photographer profile not found")
        
        owner_id = photographer.data[0]['id']
        
        # Get rental and verify ownership
        rental = supabase.table('equipment_rental').select('*').eq('id', rental_id).eq('owner_id', owner_id).limit(1).execute()
        if not rental.data:
            raise HTTPException(status_code=404, detail="Rental not found or unauthorized")
        
        rental_data = rental.data[0]
        
        if rental_data['status'] != 'active':
            raise HTTPException(status_code=400, detail="Only active rentals can be returned")
        
        # Calculate deposit refund
        deposit = rental_data['security_deposit']
        deduction = min(payload.deduction_amount, deposit)
        refund_amount = deposit - deduction
        
        # Update status
        resp = supabase.table('equipment_rental').update({
            "status": "returned",
            "notes": f"Returned. Deposit: Rs.{deposit}, Deduction: Rs.{deduction}, Refund: Rs.{refund_amount}. {payload.reason}",
            "updated_at": datetime.now().isoformat()
        }).eq('id', rental_id).execute()
        
        # Release deposit via escrow service
        # In production, this would trigger actual payment processing
        
        return {
            "success": True, 
            "data": resp.data,
            "deposit_refund": refund_amount,
            "deduction": deduction,
            "message": f"Equipment returned. Rs.{refund_amount} deposit refunded to renter."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/rentals/{rental_id}/dispute")
def create_rental_dispute(
    rental_id: str,
    payload: DisputeRentalRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a dispute for an equipment rental"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get rental
        rental = supabase.table('equipment_rental').select(
            '*, equipment!equipment_rental_equipment_id_fkey(name, photographer_profile!equipment_photographer_id_fkey(id, user_id))'
        ).eq('id', rental_id).limit(1).execute()
        
        if not rental.data:
            raise HTTPException(status_code=404, detail="Rental not found")
        
        rental_data = rental.data[0]
        owner_user_id = rental_data['equipment']['photographer_profile']['user_id']
        
        # Verify user is part of this rental
        if user_id != rental_data['renter_id'] and user_id != owner_user_id:
            raise HTTPException(status_code=403, detail="Unauthorized to dispute this rental")
        
        # Create complaint/dispute
        dispute = {
            "user_id": user_id,
            "booking_id": None,  # Not a booking
            "photographer_id": rental_data['equipment']['photographer_profile']['id'],
            "subject": f"Equipment Rental Dispute: {rental_data['equipment']['name']}",
            "description": f"Rental ID: {rental_id}\nReason: {payload.dispute_reason}\n\n{payload.description}",
            "category": "equipment_rental",
            "priority": "high",
            "status": "open"
        }
        
        resp = supabase.table('complaints').insert(dispute).execute()
        
        # Update rental status to indicate dispute
        supabase.table('equipment_rental').update({
            "notes": f"DISPUTE RAISED: {payload.dispute_reason}",
            "updated_at": datetime.now().isoformat()
        }).eq('id', rental_id).execute()
        
        return {"success": True, "data": resp.data, "message": "Dispute submitted. Admin will review within 24-48 hours."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/rentals/{rental_id}/pay")
def process_rental_payment(rental_id: str, current_user: dict = Depends(get_current_user)):
    """Process payment for an approved rental (creates Stripe payment intent)"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get rental
        rental = supabase.table('equipment_rental').select('*').eq('id', rental_id).eq('renter_id', user_id).limit(1).execute()
        
        if not rental.data:
            raise HTTPException(status_code=404, detail="Rental not found or unauthorized")
        
        rental_data = rental.data[0]
        
        if rental_data['status'] != 'approved':
            raise HTTPException(status_code=400, detail="Rental must be approved before payment")
        
        if rental_data['payment_status'] == 'paid':
            raise HTTPException(status_code=400, detail="Rental is already paid")
        
        total_amount = rental_data['rental_price'] + rental_data['security_deposit']
        
        # In production: Create Stripe payment intent
        # import stripe
        # intent = stripe.PaymentIntent.create(
        #     amount=int(total_amount * 100),
        #     currency='pkr',
        #     metadata={'rental_id': rental_id}
        # )
        
        # For now, simulate payment intent creation
        payment_intent_id = f"pi_rental_{rental_id}_{uuid.uuid4().hex[:8]}"
        
        return {
            "success": True,
            "payment_intent_id": payment_intent_id,
            "amount": total_amount,
            "rental_price": rental_data['rental_price'],
            "security_deposit": rental_data['security_deposit'],
            "message": "Payment intent created. Complete payment to proceed."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/rentals/{rental_id}/confirm-payment")
def confirm_rental_payment(rental_id: str, current_user: dict = Depends(get_current_user)):
    """Confirm payment completion for a rental"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get rental
        rental = supabase.table('equipment_rental').select('*').eq('id', rental_id).eq('renter_id', user_id).limit(1).execute()
        
        if not rental.data:
            raise HTTPException(status_code=404, detail="Rental not found or unauthorized")
        
        rental_data = rental.data[0]
        
        if rental_data['payment_status'] == 'paid':
            return {"success": True, "message": "Payment already confirmed"}
        
        # Update payment status
        resp = supabase.table('equipment_rental').update({
            "payment_status": "paid",
            "updated_at": datetime.now().isoformat()
        }).eq('id', rental_id).execute()
        
        # Create escrow transaction
        escrow_service.create_escrow(
            transaction_id=f"escrow_rental_{rental_id}",
            booking_id=rental_id,  # Using rental_id as booking_id
            amount=rental_data['rental_price'],
            client_id=user_id,
            photographer_id=rental_data['owner_id'],
            transaction_type="equipment_rental",
            deposit_amount=rental_data['security_deposit']
        )
        
        return {"success": True, "data": resp.data, "message": "Payment confirmed. Rental is ready for pickup."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ================================
# ADMIN RENTAL ENDPOINTS
# ================================

def verify_admin(current_user: dict = Depends(get_current_user)):
    """Verify user is an admin"""
    user_id = current_user.get("id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user = supabase.table('users').select('role').eq('id', user_id).limit(1).execute()
    if not user.data or user.data[0].get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return current_user


@router.get("/admin/rentals")
def admin_get_all_rentals(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(verify_admin)
):
    """Get all rentals (admin only)"""
    try:
        query = supabase.table('equipment_rental').select(
            '*, equipment!equipment_rental_equipment_id_fkey(name, category, brand, model), '
            'users!equipment_rental_renter_id_fkey(full_name, email)'
        )
        
        if status:
            query = query.eq('status', status)
        
        resp = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/admin/disputes")
def admin_get_rental_disputes(
    status: Optional[str] = None,
    current_user: dict = Depends(verify_admin)
):
    """Get all equipment rental disputes (admin only)"""
    try:
        query = supabase.table('complaints').select(
            '*, users!complaint_user_id_fkey(full_name, email), photographer_profile!complaint_photographer_id_fkey(business_name)'
        ).eq('category', 'equipment_rental')
        
        if status:
            query = query.eq('status', status)
        
        resp = query.order('created_at', desc=True).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


class ResolveDisputeRequest(BaseModel):
    resolution: str
    deposit_action: str  # "full_refund", "partial_refund", "forfeit"
    refund_amount: Optional[float] = None
    notes: Optional[str] = None


@router.put("/admin/disputes/{dispute_id}/resolve")
def admin_resolve_dispute(
    dispute_id: str,
    payload: ResolveDisputeRequest,
    current_user: dict = Depends(verify_admin)
):
    """Resolve an equipment rental dispute (admin only)"""
    try:
        # Get dispute
        dispute = supabase.table('complaints').select('*').eq('id', dispute_id).limit(1).execute()
        if not dispute.data:
            raise HTTPException(status_code=404, detail="Dispute not found")
        
        dispute_data = dispute.data[0]
        
        if dispute_data['status'] == 'resolved':
            raise HTTPException(status_code=400, detail="Dispute is already resolved")
        
        # Extract rental_id from description (format: "Rental ID: xxx")
        description = dispute_data.get('description', '')
        rental_id = None
        if 'Rental ID:' in description:
            rental_id = description.split('Rental ID:')[1].split('\n')[0].strip()
        
        # Update dispute status
        resp = supabase.table('complaints').update({
            "status": "resolved",
            "resolution": f"{payload.resolution}\nDeposit Action: {payload.deposit_action}" + 
                         (f"\nRefund Amount: Rs.{payload.refund_amount}" if payload.refund_amount else "") +
                         (f"\nAdmin Notes: {payload.notes}" if payload.notes else ""),
            "resolved_at": datetime.now().isoformat()
        }).eq('id', dispute_id).execute()
        
        # If rental_id found, update rental notes
        if rental_id:
            supabase.table('equipment_rental').update({
                "notes": f"DISPUTE RESOLVED: {payload.deposit_action}. {payload.resolution}",
                "updated_at": datetime.now().isoformat()
            }).eq('id', rental_id).execute()
        
        return {
            "success": True, 
            "data": resp.data, 
            "message": f"Dispute resolved with {payload.deposit_action}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

