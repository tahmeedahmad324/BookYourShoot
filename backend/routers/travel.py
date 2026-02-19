"""
Travel Router
=============
Endpoints for inter-city travel cost estimation.

PRD: "Bus First, Calculate Second" hybrid strategy.
  GET  /api/travel/estimate          — Core estimate endpoint
  GET  /api/travel/cities            — Supported cities list
  GET  /api/travel/bus-fares         — List bus fares (public)
  POST /api/travel/photographer/settings — Save photographer travel prefs
  GET  /api/travel/photographer/settings — Get photographer travel prefs
  GET  /api/travel/photographer/{id}/settings — Public view of photographer travel info

Admin endpoints:
  POST   /api/travel/admin/bus-fares       — Create bus fare
  PUT    /api/travel/admin/bus-fares/{id}  — Update bus fare
  DELETE /api/travel/admin/bus-fares/{id}  — Delete bus fare
  GET    /api/travel/admin/cache-stats     — Cache statistics
  POST   /api/travel/admin/cache-cleanup   — Purge expired cache
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
import math

from backend.auth import get_current_user
from backend.supabase_client import supabase
from backend.services.travel_cost_service import travel_cost_service

router = APIRouter(prefix="/travel", tags=["Travel"])


# ====================================================================
#  Pydantic Models
# ====================================================================

class CalculateTravelRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    transportation_mode: str = "car"  # car, bike, public_transport


class PhotographerTravelSettingsRequest(BaseModel):
    is_willing_to_travel: bool = True
    base_city: str = "Lahore"
    per_km_rate: float = 30
    per_hour_rate: float = 0
    min_charge: float = 500
    requires_accommodation: bool = False
    accommodation_fee: float = 3000
    avoided_cities: List[str] = []
    preferred_transport: str = "bus"  # bus, car, bike
    max_travel_distance_km: float = 500
    notes: str = ""


class BusFareRequest(BaseModel):
    from_city: str
    to_city: str
    service_provider: str = "Daewoo"
    one_way_amount: float
    is_active: bool = True


class QuickDistanceRequest(BaseModel):
    city1: str
    city2: str


# ====================================================================
#  Helper: Admin verification (reuse pattern from admin router)
# ====================================================================

def verify_admin(current_user: dict = Depends(get_current_user)):
    """Verify user is an admin."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ====================================================================
#  Haversine (kept for backward-compat legacy endpoint)
# ====================================================================

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km."""
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


# ====================================================================
#  PUBLIC ENDPOINTS
# ====================================================================

@router.get("/estimate")
def get_travel_estimate(
    from_city: str = Query(..., description="Origin city name"),
    to_city: str = Query(..., description="Destination city name"),
    photographer_id: Optional[str] = Query(None, description="Photographer UUID"),
    date: Optional[str] = Query(None, description="Event date (ISO format)"),
):
    """
    🚌 CORE ENDPOINT: Inter-city Travel Cost Estimate

    Strategy: "Bus First, Calculate Second"
      1. Look up predefined bus fare in DB
      2. If not found, check cache for distance data
      3. If cache miss, call Google Maps API (or Haversine fallback)
      4. Apply photographer-specific rates if photographer_id provided
      5. Return one-way & round-trip breakdowns

    Query Params:
      - from_city: Origin city (e.g. "Lahore")
      - to_city: Destination city (e.g. "Multan")
      - photographer_id: UUID (optional) — applies photographer's custom rates
      - date: ISO date (optional, for future date-based pricing)
    """
    try:
        result = travel_cost_service.calculate_estimate(
            from_city=from_city,
            to_city=to_city,
            photographer_id=photographer_id,
            date=date,
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cities")
def get_supported_cities():
    """Get list of supported Punjab cities with coordinates."""
    cities = travel_cost_service.get_supported_cities()
    return {"success": True, "data": cities}


@router.get("/bus-fares")
def list_bus_fares(
    from_city: Optional[str] = Query(None),
    to_city: Optional[str] = Query(None),
):
    """List all predefined bus fares (public, for transparency)."""
    fares = travel_cost_service.list_bus_fares(from_city=from_city, to_city=to_city)
    return {"success": True, "data": fares, "count": len(fares)}


# ====================================================================
#  PHOTOGRAPHER TRAVEL SETTINGS
# ====================================================================

@router.get("/photographer/settings")
def get_my_travel_settings(current_user: dict = Depends(get_current_user)):
    """Get the authenticated photographer's travel settings."""
    user_id = current_user.get("id") or current_user.get("sub")
    settings = travel_cost_service.get_photographer_settings(user_id)
    if not settings:
        # Return defaults
        return {
            "success": True,
            "data": {
                "photographer_id": user_id,
                "is_willing_to_travel": False,
                "base_city": "Lahore",
                "per_km_rate": 30,
                "per_hour_rate": 0,
                "min_charge": 500,
                "requires_accommodation": False,
                "accommodation_fee": 3000,
                "avoided_cities": [],
                "preferred_transport": "bus",
                "max_travel_distance_km": 500,
                "notes": "",
            },
            "is_default": True,
        }
    return {"success": True, "data": settings, "is_default": False}


@router.post("/photographer/settings")
def save_my_travel_settings(
    payload: PhotographerTravelSettingsRequest,
    current_user: dict = Depends(get_current_user),
):
    """Save/update the authenticated photographer's travel settings."""
    user_id = current_user.get("id") or current_user.get("sub")
    try:
        saved = travel_cost_service.save_photographer_settings(user_id, payload.model_dump())
        return {"success": True, "data": saved}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/photographer/{photographer_id}/settings")
def get_photographer_travel_info(photographer_id: str):
    """Public view of a photographer's travel policy (for profile pages)."""
    settings = travel_cost_service.get_photographer_settings(photographer_id)
    if not settings:
        return {
            "success": True,
            "data": None,
            "message": "Photographer has not configured travel settings.",
        }
    # Return only public-safe fields
    public_fields = {
        "is_willing_to_travel": settings.get("is_willing_to_travel", False),
        "base_city": settings.get("base_city", ""),
        "preferred_transport": settings.get("preferred_transport", "bus"),
        "max_travel_distance_km": settings.get("max_travel_distance_km", 500),
        "requires_accommodation": settings.get("requires_accommodation", False),
        "notes": settings.get("notes", ""),
    }
    return {"success": True, "data": public_fields}


# ====================================================================
#  ADMIN ENDPOINTS — Bus Fare Management
# ====================================================================

@router.post("/admin/bus-fares")
def create_bus_fare(payload: BusFareRequest, current_user: dict = Depends(verify_admin)):
    """Admin: Create a new bus fare entry."""
    try:
        fare = travel_cost_service.create_bus_fare(payload.model_dump())
        return {"success": True, "data": fare}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/admin/bus-fares/{fare_id}")
def update_bus_fare(fare_id: int, payload: BusFareRequest, current_user: dict = Depends(verify_admin)):
    """Admin: Update an existing bus fare."""
    try:
        fare = travel_cost_service.update_bus_fare(fare_id, payload.model_dump())
        return {"success": True, "data": fare}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/admin/bus-fares/{fare_id}")
def delete_bus_fare(fare_id: int, current_user: dict = Depends(verify_admin)):
    """Admin: Delete a bus fare entry."""
    success = travel_cost_service.delete_bus_fare(fare_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete fare")
    return {"success": True, "message": f"Fare {fare_id} deleted"}


@router.get("/admin/cache-stats")
def get_cache_stats(current_user: dict = Depends(verify_admin)):
    """Admin: View cache statistics."""
    stats = travel_cost_service.get_cache_stats()
    return {"success": True, "data": stats}


@router.post("/admin/cache-cleanup")
def cleanup_cache(current_user: dict = Depends(verify_admin)):
    """Admin: Purge expired cache entries."""
    count = travel_cost_service.clear_expired_cache()
    return {"success": True, "message": f"Removed {count} expired entries"}


# ====================================================================
#  LEGACY ENDPOINTS (backward compatibility)
# ====================================================================

@router.post("/estimate-legacy")
def calculate_travel_estimate_legacy(payload: CalculateTravelRequest):
    """
    [LEGACY] Calculate travel estimate using lat/lng coordinates.
    Kept for backward compatibility. Use GET /estimate with city names instead.
    """
    try:
        distance_km = haversine_distance(
            payload.origin_lat, payload.origin_lng,
            payload.destination_lat, payload.destination_lng,
        )
        # Simple cost estimation
        speeds = {"car": 50, "bike": 30, "public_transport": 25}
        speed = speeds.get(payload.transportation_mode, 40)
        duration_minutes = int((distance_km / speed) * 1.2 * 60)

        if payload.transportation_mode == "car":
            fuel_cost = (distance_km / 12) * 280
            toll = (distance_km / 30) * 50 if distance_km > 30 else 0
            total = fuel_cost + toll + 200
        elif payload.transportation_mode == "bike":
            fuel_cost = (distance_km / 35) * 280
            toll = (distance_km / 30) * 20 if distance_km > 30 else 0
            total = fuel_cost + toll + 50
        else:
            total = distance_km * 20
            fuel_cost = 0
            toll = 0

        return {
            "success": True,
            "data": {
                "distance_km": round(distance_km, 2),
                "duration_minutes": duration_minutes,
                "estimated_cost": round(total, 2),
                "transportation_mode": payload.transportation_mode,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/quick-distance")
def get_quick_distance(payload: QuickDistanceRequest):
    """[LEGACY] Quick distance estimate between two cities."""
    try:
        result = travel_cost_service.calculate_estimate(payload.city1, payload.city2)
        return {
            "success": True,
            "data": {
                "from": result["from_city"],
                "to": result["to_city"],
                "distance_km": result["distance_km"],
                "duration_car_hours": round(result["duration_minutes"] / 60, 1),
                "estimated_fuel_cost_pkr": round((result["distance_km"] / 12) * 280, 2),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}
