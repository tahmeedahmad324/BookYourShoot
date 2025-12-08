from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from backend.supabase_client import supabase
from backend.auth import get_current_user

router = APIRouter(prefix="/reviews", tags=["Reviews"])


class CreateReviewRequest(BaseModel):
    photographer_id: str
    booking_id: str
    rating: int
    comment: Optional[str] = None
    images: Optional[list] = None


class UpdateReviewRequest(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None
    images: Optional[list] = None


@router.post("/")
def create_review(payload: CreateReviewRequest, current_user: dict = Depends(get_current_user)):
    """Create a new review for a photographer"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Verify booking exists and belongs to user
        booking = supabase.table('booking').select('*').eq('id', payload.booking_id).eq('client_id', user_id).limit(1).execute()
        if not booking.data:
            raise HTTPException(status_code=404, detail="Booking not found or unauthorized")

        # Check if review already exists for this booking
        existing = supabase.table('review').select('*').eq('booking_id', payload.booking_id).limit(1).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Review already exists for this booking")

        review = {
            "photographer_id": payload.photographer_id,  # photographer_profile.id
            "client_id": user_id,
            "booking_id": payload.booking_id,
            "rating": payload.rating,
            "comment": payload.comment
        }

        resp = supabase.table('review').insert(review).execute()
        
        # Update photographer average rating
        update_photographer_rating(payload.photographer_id)
        
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/photographer/{photographer_id}")
def get_photographer_reviews(photographer_id: str, limit: int = 10, offset: int = 0):
    """Get all reviews for a photographer (photographer_id is photographer_profile.id)"""
    try:
        resp = supabase.table('review').select(
            '*, users!review_client_id_fkey(full_name, email)'
        ).eq('photographer_id', photographer_id).order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/{review_id}")
def get_review(review_id: str):
    """Get a specific review by ID"""
    try:
        resp = supabase.table('review').select(
            '*, photographer_profile!review_photographer_id_fkey(*), users!review_client_id_fkey(*)'
        ).eq('id', review_id).limit(1).execute()
        return {"success": True, "data": resp.data[0] if resp.data else None}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.put("/{review_id}")
def update_review(review_id: str, payload: UpdateReviewRequest, current_user: dict = Depends(get_current_user)):
    """Update an existing review"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Verify review belongs to user
        review = supabase.table('review').select('*').eq('id', review_id).eq('client_id', user_id).limit(1).execute()
        if not review.data:
            raise HTTPException(status_code=404, detail="Review not found or unauthorized")

        updates = {}
        if payload.rating is not None:
            updates['rating'] = payload.rating
        if payload.comment is not None:
            updates['comment'] = payload.comment

        resp = supabase.table('review').update(updates).eq('id', review_id).execute()
        
        # Update photographer average rating
        photographer_id = review.data[0]['photographer_id']
        update_photographer_rating(photographer_id)
        
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{review_id}")
def delete_review(review_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a review"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Verify review belongs to user
        review = supabase.table('review').select('*').eq('id', review_id).eq('client_id', user_id).limit(1).execute()
        if not review.data:
            raise HTTPException(status_code=404, detail="Review not found or unauthorized")

        photographer_id = review.data[0]['photographer_id']
        
        resp = supabase.table('review').delete().eq('id', review_id).execute()
        
        # Update photographer average rating
        update_photographer_rating(photographer_id)
        
        return {"success": True, "message": "Review deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def update_photographer_rating(photographer_id: str):
    """Helper function to recalculate and update photographer average rating"""
    try:
        reviews = supabase.table('review').select('rating').eq('photographer_id', photographer_id).execute()
        if reviews.data:
            ratings = [float(r['rating']) for r in reviews.data if r.get('rating')]
            if ratings:
                avg_rating = sum(ratings) / len(ratings)
                reviews_count = len(ratings)
                
                supabase.table('photographer_profile').update({
                    'rating_avg': round(avg_rating, 2),
                    'reviews_count': reviews_count
                }).eq('id', photographer_id).execute()
    except Exception as e:
        print(f"Error updating photographer rating: {e}")
