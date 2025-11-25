from fastapi import APIRouter
from backend.supabase_client import supabase

router = APIRouter(prefix="/photographers", tags=["Photographers"])


@router.get("/")
def list_photographers(city: str = None, specialty: str = None, available_only: bool = False, limit: int = 20, offset: int = 0):
    # Basic query to supabase to fetch photographers with optional filters
    try:
        query = supabase.table('photographer_profile').select('*, users:users(*)', count='exact').eq('users.role', 'photographer')

        if city:
            query = query.eq('users.city', city)
        if specialty:
            query = query.contains('specialties', [specialty])

        # Note: availability calculation would require booking checks; skip for now
        response = query.range(offset, offset + limit - 1).execute()

        return {"success": True, "data": response.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/{photographer_id}")
def get_photographer(photographer_id: str):
    try:
        response = supabase.table('photographer_profile').select('*, users:users(*)').eq('id', photographer_id).limit(1).execute()
        data = response.data[0] if response.data else None
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}
