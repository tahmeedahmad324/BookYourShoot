from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from backend.supabase_client import supabase
from backend.auth import get_current_user

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
