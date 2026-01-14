from typing import Optional
from fastapi import APIRouter, Query
from backend.supabase_client import supabase
import json
from pathlib import Path

router = APIRouter(prefix="/photographers", tags=["Photographers"])

# Load mock data for FYP demo
MOCK_DATA_PATH = Path(__file__).resolve().parent.parent.parent / "src" / "data" / "photographers.json"

def get_mock_photographers():
    """Load mock photographer data from JSON file for demo purposes"""
    try:
        with open(MOCK_DATA_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('photographers', [])
    except Exception as e:
        print(f"Error loading mock photographers: {e}")
        return []


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
    Uses mock data for FYP demo when database is unavailable.
    """
    try:
        # Try database first
        query = supabase.table('photographer_profile').select(
            '*, users!photographer_profile_user_id_fkey(id, full_name, email, phone, city, role)'
        )
        
        if available_only:
            query = query.eq('verified', True)
        
        if specialty:
            query = query.contains('specialties', [specialty])
        
        response = query.range(offset, offset + limit - 1).execute()
        
        photographers = []
        for item in response.data:
            user = item.get('users', {})
            
            if city and user.get('city', '').lower() != city.lower():
                continue
            
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
                "portfolio": [],
                "rating": float(item.get('rating_avg', 0)) if item.get('rating_avg') else 0,
                "reviews_count": item.get('reviews_count', 0),
                "availability": item.get('verified', False),
                "verified": item.get('verified', False),
                "completed_bookings": 0,
                "response_time": "1 hour"
            }
            photographers.append(photographer)
        
        photographers.sort(key=lambda x: (x['verified'], x['rating']), reverse=True)
        
        if photographers:
            return {"success": True, "data": photographers, "count": len(photographers)}
        
        # Fallback to mock data if no database results
        raise Exception("No database results, using mock data")
        
    except Exception as e:
        # Use mock data for FYP demo
        print(f"Using mock photographer data: {str(e)}")
        photographers = get_mock_photographers()
        
        # Apply filters to mock data
        if city:
            photographers = [p for p in photographers if p.get('location', '').lower() == city.lower()]
        
        if specialty:
            photographers = [p for p in photographers if specialty in p.get('specialty', [])]
        
        if available_only:
            photographers = [p for p in photographers if p.get('verified', False)]
        
        # Apply pagination
        start = offset
        end = offset + limit
        photographers = photographers[start:end]
        
        return {"success": True, "data": photographers, "count": len(photographers)}


@router.get("/{photographer_id}")
def get_photographer(photographer_id: str):
    """
    Get detailed photographer profile by user_id.
    Returns full profile with user data, equipment, and reviews.
    Uses mock data for FYP demo when database is unavailable.
    """
    try:
        # Try database first
        profile_response = supabase.table('photographer_profile').select(
            '*, users!photographer_profile_user_id_fkey(*)'
        ).eq('user_id', photographer_id).limit(1).execute()
        
        if not profile_response.data:
            raise Exception("Not found in database, trying mock data")
        
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
            "portfolio": [],
            "rating": float(item.get('rating_avg', 0)) if item.get('rating_avg') else 0,
            "reviews_count": item.get('reviews_count', 0),
            "availability": item.get('verified', False),
            "verified": item.get('verified', False),
            "completed_bookings": 0,
            "response_time": "1 hour",
            "cnic_verified": item.get('admin_approved', False),
            "equipment": equipment_response.data,
            "reviews": reviews
        }
        
        return {"success": True, "data": photographer}
        
    except Exception as e:
        # Fallback to mock data
        print(f"Using mock photographer data for ID {photographer_id}: {str(e)}")
        photographers = get_mock_photographers()
        
        # Convert photographer_id to int if possible
        try:
            photographer_id_int = int(photographer_id)
        except:
            photographer_id_int = None
        
        # Find photographer by ID
        photographer = None
        for p in photographers:
            if p.get('id') == photographer_id_int or str(p.get('id')) == photographer_id:
                photographer = p
                break
        
        if not photographer:
            return {"success": False, "error": "Photographer not found", "data": None}
        
        return {"success": True, "data": photographer}

