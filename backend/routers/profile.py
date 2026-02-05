from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from backend.supabase_client import supabase
from backend.auth import get_current_user

router = APIRouter(prefix="/profile", tags=["Profile"])


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    profile_picture_url: Optional[str] = None
    is_active: Optional[bool] = None


class UpdatePhotographerProfileRequest(BaseModel):
    bio: Optional[str] = None
    specialties: Optional[list] = None
    experience_years: Optional[int] = None
    hourly_rate: Optional[float] = None
    profile_image_path: Optional[str] = None
    portfolio_images: Optional[list] = None
    equipment_list: Optional[list] = None
    coverage_areas: Optional[list] = None
    availability: Optional[dict] = None  # JSONB field for weekly schedule
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    stripe_account_id: Optional[str] = None
    stripe_onboarding_complete: Optional[bool] = None


@router.get("/me")
def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Get user data
        user = supabase.table('users').select('*').eq('id', user_id).limit(1).execute()
        
        if not user.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user.data[0]
        
        # Get photographer profile if exists
        photographer = supabase.table('photographer_profile').select('*').eq('user_id', user_id).limit(1).execute()
        
        return {
            "success": True,
            "data": {
                "user": user_data,
                "photographer_profile": photographer.data[0] if photographer.data else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.put("/me")
def update_my_profile(payload: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    """Update current user's basic profile"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        updates = {}
        if payload.full_name is not None:
            updates['full_name'] = payload.full_name
        if payload.phone is not None:
            updates['phone'] = payload.phone
        if payload.city is not None:
            updates['city'] = payload.city
        if payload.profile_picture_url is not None:
            updates['profile_picture_url'] = payload.profile_picture_url
        if payload.is_active is not None:
            updates['is_active'] = payload.is_active

        resp = supabase.table('users').update(updates).eq('id', user_id).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/photographer/{photographer_id}")
def get_photographer_profile(photographer_id: str):
    """Get public photographer profile"""
    try:
        # Get photographer profile with user data
        photographer = supabase.table('photographer_profile').select('*, users!photographer_profile_user_id_fkey(*)').eq('id', photographer_id).limit(1).execute()
        
        if not photographer.data:
            raise HTTPException(status_code=404, detail="Photographer not found")
        
        # Get equipment
        equipment = supabase.table('equipment').select('*').eq('photographer_id', photographer_id).eq('is_active', True).execute()
        
        # Get reviews
        reviews = supabase.table('review').select('*, users!review_client_id_fkey(full_name)').eq('photographer_id', photographer_id).order('created_at', desc=True).limit(10).execute()
        
        return {
            "success": True,
            "data": {
                "profile": photographer.data[0],
                "equipment": equipment.data,
                "reviews": reviews.data
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.put("/photographer/me")
def update_photographer_profile(payload: UpdatePhotographerProfileRequest, current_user: dict = Depends(get_current_user)):
    """Update photographer profile"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Check if photographer profile exists
        existing = supabase.table('photographer_profile').select('id').eq('user_id', user_id).limit(1).execute()
        
        updates = {}
        if payload.bio is not None:
            updates['bio'] = payload.bio
        if payload.specialties is not None:
            updates['specialties'] = payload.specialties
        if payload.experience_years is not None:
            updates['experience_years'] = payload.experience_years
        if payload.hourly_rate is not None:
            updates['hourly_rate'] = payload.hourly_rate
        if payload.profile_image is not None:
            updates['profile_image_path'] = payload.profile_image
        if payload.portfolio_images is not None:
            updates['portfolio_images'] = payload.portfolio_images
        if payload.equipment_list is not None:
            updates['equipment_list'] = payload.equipment_list
        if payload.coverage_areas is not None:
            updates['coverage_areas'] = payload.coverage_areas
        if payload.availability_hours is not None:
            updates['availability_hours'] = payload.availability_hours

        if existing.data:
            # Update existing profile
            resp = supabase.table('photographer_profile').update(updates).eq('user_id', user_id).execute()
        else:
            # Create new photographer profile
            updates['user_id'] = user_id
            resp = supabase.table('photographer_profile').insert(updates).execute()
        
        return {"success": True, "data": resp.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/photographer/upgrade")
def upgrade_to_photographer(current_user: dict = Depends(get_current_user)):
    """Upgrade user account to photographer"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Check if already a photographer
        existing = supabase.table('photographer_profile').select('id').eq('user_id', user_id).limit(1).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="User is already a photographer")

        # Update user role
        supabase.table('users').update({'role': 'photographer'}).eq('id', user_id).execute()
        
        # Create photographer profile
        profile = {
            'user_id': user_id,
            'verified': False,
            'admin_approved': False,
            'rating_avg': 0.0,
            'reviews_count': 0
        }
        resp = supabase.table('photographer_profile').insert(profile).execute()
        
        return {"success": True, "message": "Account upgraded to photographer. Verification pending.", "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/me/delete-account")
def delete_account(current_user: dict = Depends(get_current_user)):
    """
    Delete user account and all associated data
    WARNING: This action cannot be undone
    """
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Check for active bookings
        active_bookings = supabase.table('booking').select('id').or_(
            f'client_id.eq.{user_id},photographer_id.eq.{user_id}'
        ).in_('status', ['requested', 'accepted', 'confirmed', 'paid']).execute()
        
        if active_bookings.data:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete account with {len(active_bookings.data)} active booking(s). Please cancel or complete all bookings first."
            )
        
        # Delete in order (foreign key constraints)
        # 1. Delete reviews given by user
        supabase.table('review').delete().eq('client_id', user_id).execute()
        
        # 2. Delete equipment rentals
        supabase.table('equipment_rental').delete().eq('client_id', user_id).execute()
        
        # 3. Delete bookings (past ones only, active already checked)
        supabase.table('booking').delete().or_(
            f'client_id.eq.{user_id},photographer_id.eq.{user_id}'
        ).execute()
        
        # 4. Delete notifications
        supabase.table('notification').delete().eq('user_id', user_id).execute()
        
        # 5. Delete equipment if photographer
        supabase.table('equipment').delete().eq('photographer_id', user_id).execute()
        
        # 6. Delete photographer profile if exists
        supabase.table('photographer_profile').delete().eq('user_id', user_id).execute()
        
        # 7. Delete user account
        supabase.table('users').delete().eq('id', user_id).execute()
        
        # 8. Delete from Supabase Auth
        try:
            supabase.auth.admin.delete_user(user_id)
        except:
            pass  # Continue even if auth deletion fails
        
        return {
            "success": True,
            "message": "Account deleted successfully. All your data has been permanently removed."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))