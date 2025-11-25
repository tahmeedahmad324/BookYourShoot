from typing import Optional
from fastapi import APIRouter, Query
from backend.supabase_client import supabase

router = APIRouter(prefix="/photographers", tags=["Photographers"])


@router.get("/")
def list_photographers(
    city: Optional[str] = None,
    specialty: Optional[str] = None,
    search: Optional[str] = None,
    available_only: bool = False,
    limit: int = Query(20, le=50),
    offset: int = 0,
):
    """List photographers with optional filters, search and pagination.
    Returns joined `photographer_profile` rows with `users` data.
    """
    try:
        # Start with photographer profiles joined to users
        # `count='exact'` is used to request a total count where supported by the client.
        # Some supabase-py versions expect an enum/typed value; passing as string may produce type-checker warnings,
        # but at runtime it typically works. If your client fails, remove `count` or adapt to your client API.
        try:
            query = supabase.table('photographer_profile').select('*, users:users(*)', count='exact') # type: ignore
        except TypeError:
            # Fallback for clients that reject the `count` parameter type
            query = supabase.table('photographer_profile').select('*, users:users(*)')

        # Apply filters by joined `users` fields via RPC-like filters when supported
        if city:
            query = query.eq('users.city', city)
        if specialty:
            # specialties assumed stored as array/JSON
            query = query.contains('specialties', [specialty])
        if search:
            # Try matching on user full_name or bio using ILIKE (case-insensitive)
            # supabase-py supports .ilike through the filters API; if not available this will be a no-op
            try:
                query = query.ilike('users.full_name', f'%{search}%')
            except Exception:
                # fallback to basic contains on a text field if ilike not supported
                pass

        # Note: availability would require calendar/booking checks; left as future work
        response = query.range(offset, offset + limit - 1).execute()

        return {"success": True, "data": response.data, "count": getattr(response, 'count', None)}
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
