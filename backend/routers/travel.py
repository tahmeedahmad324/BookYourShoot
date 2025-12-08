from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import math

router = APIRouter(prefix="/travel", tags=["Travel"])


class CalculateTravelRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    transportation_mode: str = "car"  # car, bike, public_transport


class TravelEstimate(BaseModel):
    distance_km: float
    duration_minutes: int
    estimated_cost: float
    fuel_cost: Optional[float] = None
    toll_estimate: Optional[float] = None


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in kilometers
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    
    return c * r


def estimate_duration(distance_km: float, mode: str) -> int:
    """
    Estimate travel duration in minutes based on distance and transportation mode
    """
    # Average speeds (km/h)
    speeds = {
        "car": 50,  # Average city driving
        "bike": 30,  # Motorcycle
        "public_transport": 25  # Bus/public transport
    }
    
    speed = speeds.get(mode, 40)
    
    # Add buffer time for traffic (20%)
    duration_hours = (distance_km / speed) * 1.2
    return int(duration_hours * 60)


def estimate_cost(distance_km: float, mode: str) -> dict:
    """
    Estimate travel costs based on distance and mode
    Returns dict with breakdown of costs
    """
    costs = {}
    
    if mode == "car":
        # Fuel cost estimation (PKR)
        # Assuming 12 km/liter and PKR 280 per liter
        fuel_per_liter = 280
        km_per_liter = 12
        costs['fuel_cost'] = (distance_km / km_per_liter) * fuel_per_liter
        
        # Toll estimate (rough calculation: PKR 50 per 30km on highways)
        if distance_km > 30:
            costs['toll_estimate'] = (distance_km / 30) * 50
        else:
            costs['toll_estimate'] = 0
        
        # Parking estimate
        costs['parking_estimate'] = 200 if distance_km > 10 else 100
        
        costs['total'] = costs['fuel_cost'] + costs['toll_estimate'] + costs['parking_estimate']
    
    elif mode == "bike":
        # Better fuel efficiency for bikes
        fuel_per_liter = 280
        km_per_liter = 35
        costs['fuel_cost'] = (distance_km / km_per_liter) * fuel_per_liter
        
        # Lower toll for bikes
        if distance_km > 30:
            costs['toll_estimate'] = (distance_km / 30) * 20
        else:
            costs['toll_estimate'] = 0
        
        # Minimal parking cost
        costs['parking_estimate'] = 50
        
        costs['total'] = costs['fuel_cost'] + costs['toll_estimate'] + costs['parking_estimate']
    
    else:  # public_transport
        # Estimated bus/rickshaw fare (PKR 20 per km average)
        costs['fare_estimate'] = distance_km * 20
        costs['total'] = costs['fare_estimate']
    
    return costs


@router.post("/estimate")
def calculate_travel_estimate(payload: CalculateTravelRequest):
    """
    Calculate travel distance, duration, and cost estimate between two locations
    """
    try:
        # Calculate distance using Haversine formula
        distance_km = haversine_distance(
            payload.origin_lat,
            payload.origin_lng,
            payload.destination_lat,
            payload.destination_lng
        )
        
        # Estimate duration
        duration_minutes = estimate_duration(distance_km, payload.transportation_mode)
        
        # Estimate costs
        cost_breakdown = estimate_cost(distance_km, payload.transportation_mode)
        
        # Build response
        result = {
            "distance_km": round(distance_km, 2),
            "duration_minutes": duration_minutes,
            "estimated_cost": round(cost_breakdown['total'], 2),
            "transportation_mode": payload.transportation_mode,
            "cost_breakdown": {k: round(v, 2) for k, v in cost_breakdown.items() if k != 'total'}
        }
        
        return {"success": True, "data": result}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cities")
def get_supported_cities():
    """Get list of supported cities with coordinates"""
    cities = [
        {"name": "Karachi", "lat": 24.8607, "lng": 67.0011, "country": "Pakistan"},
        {"name": "Lahore", "lat": 31.5204, "lng": 74.3587, "country": "Pakistan"},
        {"name": "Islamabad", "lat": 33.6844, "lng": 73.0479, "country": "Pakistan"},
        {"name": "Rawalpindi", "lat": 33.5651, "lng": 73.0169, "country": "Pakistan"},
        {"name": "Faisalabad", "lat": 31.4504, "lng": 73.1350, "country": "Pakistan"},
        {"name": "Multan", "lat": 30.1575, "lng": 71.5249, "country": "Pakistan"},
        {"name": "Peshawar", "lat": 34.0151, "lng": 71.5249, "country": "Pakistan"},
        {"name": "Quetta", "lat": 30.1798, "lng": 66.9750, "country": "Pakistan"},
        {"name": "Sialkot", "lat": 32.4945, "lng": 74.5229, "country": "Pakistan"},
        {"name": "Gujranwala", "lat": 32.1617, "lng": 74.1883, "country": "Pakistan"},
    ]
    
    return {"success": True, "data": cities}


class QuickDistanceRequest(BaseModel):
    city1: str
    city2: str


@router.post("/quick-distance")
def get_quick_distance(payload: QuickDistanceRequest):
    """Get quick distance estimate between two major cities"""
    try:
        cities_resp = get_supported_cities()
        cities = {city['name'].lower(): city for city in cities_resp['data']}
        
        city1_name = payload.city1.lower()
        city2_name = payload.city2.lower()
        
        if city1_name not in cities or city2_name not in cities:
            raise HTTPException(status_code=404, detail="City not found in database")
        
        city1 = cities[city1_name]
        city2 = cities[city2_name]
        
        distance_km = haversine_distance(
            city1['lat'], city1['lng'],
            city2['lat'], city2['lng']
        )
        
        return {
            "success": True,
            "data": {
                "from": city1['name'],
                "to": city2['name'],
                "distance_km": round(distance_km, 2),
                "duration_car_hours": round(distance_km / 60, 1),  # Assuming 60 km/h average
                "estimated_fuel_cost_pkr": round((distance_km / 12) * 280, 2)  # 12 km/l, PKR 280/l
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}
