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
    """
    List photographers with optional filters.
    Matches frontend expectations by joining users and photographer_profile tables.
    """
    try:
        # Query photographer_profile and join with users table
        query = supabase.table('photographer_profile').select(
            '*, users!photographer_profile_user_id_fkey(id, full_name, email, phone, city, role)'
        )
        
        # Only show verified photographers by default
        if available_only:
            query = query.eq('verified', True)
        
        # Filter by city (via joined users table)
        if city:
            # Note: Filtering on joined table requires RPC or post-filter
            # For now, we'll fetch and filter in Python
            pass
        
        # Filter by specialty
        if specialty:
            query = query.contains('specialties', [specialty])
        
        # Execute query
        response = query.range(offset, offset + limit - 1).execute()
        
        # Post-filter by city if needed and transform to match frontend expectations
        photographers = []
        for item in response.data:
            user = item.get('users', {})
            
            # Skip if city filter doesn't match
            if city and user.get('city', '').lower() != city.lower():
                continue
            
            # Transform to match frontend expected format
            photographer = {
                "id": item['user_id'],  # Use user_id as the photographer ID
                "name": user.get('full_name', ''),
                "email": user.get('email', ''),
                "phone": user.get('phone', ''),
                "specialty": item.get('specialties', []),
                "experience": item.get('experience_years', 0),
                "location": user.get('city', ''),
                "hourly_rate": float(item.get('hourly_rate', 0)) if item.get('hourly_rate') else 0,
                "profile_image": item.get('profile_image_path', ''),
                "portfolio": [],  # Can be populated later
                "rating": float(item.get('rating_avg', 0)) if item.get('rating_avg') else 0,
                "reviews_count": item.get('reviews_count', 0),
                "availability": item.get('verified', False),
                "verified": item.get('verified', False),
                "completed_bookings": 0,  # Calculate from booking table if needed
                "response_time": "1 hour"  # Default value
            }
            photographers.append(photographer)
        
        # Sort by rating and availability
        photographers.sort(key=lambda x: (x['verified'], x['rating']), reverse=True)
        
        return {"success": True, "data": photographers, "count": len(photographers)}
        
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}


@router.get("/{photographer_id}")
def get_photographer(photographer_id: str):
    """
    Get detailed photographer profile by user_id.
    Returns full profile with user data, equipment, and reviews.
    """
    try:
        # Get photographer profile with user data
        profile_response = supabase.table('photographer_profile').select(
            '*, users!photographer_profile_user_id_fkey(*)'
        ).eq('user_id', photographer_id).limit(1).execute()
        
        if not profile_response.data:
            return {"success": False, "error": "Photographer not found", "data": None}
        
        item = profile_response.data[0]
        user = item.get('users', {})
        
        # Get equipment
        equipment_response = supabase.table('equipment').select('*').eq('photographer_id', item['id']).eq('available', True).execute()
        
        # Get recent reviews
        reviews_response = supabase.table('review').select(
            '*, users!review_client_id_fkey(full_name)'
        ).eq('photographer_id', item['id']).order('created_at', desc=True).limit(10).execute()
        
        # Transform reviews
        reviews = []
        for review in reviews_response.data:
            reviews.append({
                "id": review['id'],
                "client_name": review.get('users', {}).get('full_name', 'Anonymous'),
                "rating": float(review.get('rating', 0)),
                "comment": review.get('comment', ''),
                "created_at": review.get('created_at', '')
            })
        
        # Build complete photographer profile
        photographer = {
            "id": item['user_id'],
            "name": user.get('full_name', ''),
            "email": user.get('email', ''),
            "phone": user.get('phone', ''),
            "specialty": item.get('specialties', []),
            "experience": item.get('experience_years', 0),
            "location": user.get('city', ''),
            "hourly_rate": float(item.get('hourly_rate', 0)) if item.get('hourly_rate') else 0,
            "profile_image": item.get('profile_image_path', ''),
            "portfolio": [],  # Can be populated from storage
            "rating": float(item.get('rating_avg', 0)) if item.get('rating_avg') else 0,
            "reviews_count": item.get('reviews_count', 0),
            "availability": item.get('verified', False),
            "verified": item.get('verified', False),
            "completed_bookings": 0,  # Calculate from bookings
            "response_time": "1 hour",
            "cnic_verified": item.get('admin_approved', False),
            "equipment": equipment_response.data,
            "reviews": reviews
        }
        
        return {"success": True, "data": photographer}
        
    except Exception as e:
        return {"success": False, "error": str(e), "data": None}

