"""
Travel Cost Estimation Service
==============================
Production-ready "Bus First, Calculate Second" strategy (Round-Trip Only):

Distance Resolution Order:
  1. OSRM routing API (real road distance, 5s timeout, 1 retry)
  2. Punjab inter-city distance matrix (hardcoded for offline reliability)
  3. Haversine × 1.4 road factor (geometric fallback for unknown cities)

Cost Calculation Strategy:
  1. Check intercity_bus_fares DB table for predefined fares
  2. Compare bus fare vs distance-based cost (auto mode picks cheapest)
  3. Apply photographer-specific rates & overheads if provided
  4. Smart accommodation: multi-day → (days-1) nights, long single-day → 1 night
  5. Return round-trip cost breakdown

Costs (2025-2026 Pakistan):
  - Accommodation: PKR 5,000/night (budget hotel)
  - Local taxi: PKR 500-1,500 per way (scales with distance)
  - Handling: PKR 500 flat
  - Personal vehicle: PKR 35/km
"""

import math
import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

import httpx

from backend.supabase_client import supabase
from backend.data.punjab_travel_costs import PUNJAB_DISTANCES, ALL_CITIES

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
OSRM_BASE_URL = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org")

# Default overhead costs (PKR) — 2025-2026 Pakistan market rates
DEFAULT_LOCAL_TAXI_SHORT = 500       # Taxi/rickshaw for short trips (<100km)
DEFAULT_LOCAL_TAXI_MEDIUM = 1000     # Taxi/rickshaw for medium trips (100-300km)
DEFAULT_LOCAL_TAXI_LONG = 1500       # Taxi/rickshaw for long trips (300+ km)
DEFAULT_HANDLING_FEE = 500           # Misc handling/booking fee
DEFAULT_PER_KM_RATE = 35            # PKR per km (personal car: fuel + depreciation)
DEFAULT_ACCOMMODATION_FEE = 5000    # Per night (budget hotel in Pakistani city)
DEFAULT_MIN_CHARGE = 1000           # Minimum travel charge
OVERNIGHT_THRESHOLD_HOURS = 10      # If total trip > 10 hours, add accommodation
# Pakistani highways avg speed is ~60 km/h with stops, buffer makes it ~50 effective

# Punjab province city coordinates for OSRM routing and Haversine fallback
CITY_COORDS = {
    # Major Punjab cities
    "Lahore":          (31.5204, 74.3587),
    "Faisalabad":      (31.4504, 73.1350),
    "Rawalpindi":      (33.5651, 73.0169),
    "Multan":          (30.1575, 71.5249),
    "Gujranwala":      (32.1617, 74.1883),
    "Sialkot":         (32.4945, 74.5229),
    "Bahawalpur":      (29.3544, 71.6911),
    "Sargodha":        (32.0836, 72.6711),
    "Shekhupura":      (31.7135, 73.9783),
    "Jhang":           (31.2806, 72.3112),
    "Rahim Yar Khan":  (28.4212, 70.2989),
    "Gujrat":          (32.5772, 74.0834),
    "Kasur":           (31.1189, 74.4476),
    "Sahiwal":         (30.6682, 73.1114),
    "Okara":           (30.8138, 73.4534),
    "Wah Cantt":       (33.7680, 72.7512),
    "Dera Ghazi Khan": (30.0489, 70.6455),
    "Jhelum":          (32.9425, 73.7257),
    "Kamoke":          (31.9750, 74.2230),
    # Additional Punjab cities
    "Chiniot":         (31.7208, 72.9789),
    "Mianwali":        (32.5839, 71.5370),
    "Attock":          (33.7660, 72.3609),
    "Chakwal":         (32.9328, 72.8630),
    "Khanewal":        (30.3018, 71.9321),
    "Muzaffargarh":    (30.0720, 71.1932),
    "Vehari":          (30.0451, 72.3489),
    "Lodhran":         (29.5414, 71.6332),
    "Layyah":          (30.9609, 70.9409),
    "Toba Tek Singh":  (30.9709, 72.4826),
    "Hafizabad":       (32.0712, 73.6895),
    "Mandi Bahauddin": (32.5861, 73.4914),
    "Narowal":         (32.1020, 74.8730),
}


# ---------------------------------------------------------------------------
# Haversine (offline fallback)
# ---------------------------------------------------------------------------
def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km between two lat/lng points."""
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


def _local_taxi_cost(distance_km: float) -> float:
    """Get appropriate local taxi cost based on trip distance (one-way)."""
    if distance_km < 100:
        return DEFAULT_LOCAL_TAXI_SHORT
    elif distance_km < 300:
        return DEFAULT_LOCAL_TAXI_MEDIUM
    else:
        return DEFAULT_LOCAL_TAXI_LONG


# ---------------------------------------------------------------------------
# Travel Cost Service
# ---------------------------------------------------------------------------
class TravelCostService:
    """Central service for all travel cost estimation logic."""

    # ------------------------------------------------------------------
    # 1. Bus Fare Lookup (Primary)
    # ------------------------------------------------------------------
    def get_bus_fare(
        self,
        from_city: str,
        to_city: str,
        provider: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Look up predefined bus fare from the intercity_bus_fares table.
        Tries both directions (A→B and B→A) since fares are usually symmetric.
        Returns the cheapest active fare if multiple providers exist.
        """
        try:
            query = supabase.table("intercity_bus_fares").select("*").eq("is_active", True)

            if provider:
                query = query.eq("service_provider", provider)

            # Try from_city -> to_city
            resp = query.eq("from_city", from_city).eq("to_city", to_city).execute()
            fares = resp.data or []

            # Also try reverse direction
            query2 = supabase.table("intercity_bus_fares").select("*").eq("is_active", True)
            if provider:
                query2 = query2.eq("service_provider", provider)
            resp2 = query2.eq("from_city", to_city).eq("to_city", from_city).execute()
            fares.extend(resp2.data or [])

            if not fares:
                return None

            # Return cheapest fare
            cheapest = min(fares, key=lambda f: float(f["one_way_amount"]))
            return {
                "provider": cheapest["service_provider"],
                "one_way_amount": float(cheapest["one_way_amount"]),
                "from_city": from_city,
                "to_city": to_city,
            }
        except Exception as e:
            logger.warning(f"Bus fare lookup failed: {e}")
            return None

    # ------------------------------------------------------------------
    # 2. OSRM (OpenStreetMap routing) - Primary distance source
    # ------------------------------------------------------------------
    def fetch_osrm_distance(self, from_city: str, to_city: str) -> Optional[Dict]:
        """
        Call OSRM routing API using city coordinates.
        Returns distance_km & duration_minutes or None.
        
        Note: The public OSRM demo server (router.project-osrm.org) has rate limits
        and no SLA. For production, set OSRM_BASE_URL to a self-hosted instance.
        See: https://github.com/Project-OSRM/osrm-backend
        """
        from_coords = CITY_COORDS.get(from_city)
        to_coords = CITY_COORDS.get(to_city)
        if not from_coords or not to_coords:
            logger.info(f"OSRM skip: no coordinates for {from_city} or {to_city}")
            return None

        url = (
            f"{OSRM_BASE_URL}/route/v1/driving/"
            f"{from_coords[1]},{from_coords[0]};{to_coords[1]},{to_coords[0]}"
        )
        params = {"overview": "false"}

        # Try with short timeout + 1 retry (don't block the request)
        for attempt in range(2):
            try:
                with httpx.Client(timeout=5.0) as client:
                    resp = client.get(url, params=params)
                    resp.raise_for_status()
                    data = resp.json()

                if data.get("code") != "Ok":
                    logger.warning(f"OSRM API returned code={data.get('code')} for {from_city}→{to_city}")
                    return None

                route = data["routes"][0]
                distance_km = route["distance"] / 1000
                duration_minutes = int(route["duration"] // 60)

                return {
                    "distance_km": round(distance_km, 2),
                    "duration_minutes": duration_minutes,
                    "source": "osrm",
                }
            except httpx.TimeoutException:
                logger.warning(f"OSRM timeout (attempt {attempt + 1}/2) for {from_city}→{to_city}")
                continue
            except Exception as e:
                logger.warning(f"OSRM failed (attempt {attempt + 1}/2) for {from_city}→{to_city}: {e}")
                break  # Don't retry on non-timeout errors

        logger.info(f"OSRM unavailable for {from_city}→{to_city}, falling back to local data")
        return None

    # ------------------------------------------------------------------
    # 3. Punjab Distance Matrix & Haversine Fallback
    # ------------------------------------------------------------------
    def get_local_distance(self, from_city: str, to_city: str) -> Optional[Dict]:
        """
        Use the predefined PUNJAB_DISTANCES matrix or Haversine as final fallback.
        """
        from_norm = from_city.strip().title()
        to_norm = to_city.strip().title()

        # Check the static distance matrix
        distance = None
        if from_norm in PUNJAB_DISTANCES and to_norm in PUNJAB_DISTANCES.get(from_norm, {}):
            distance = PUNJAB_DISTANCES[from_norm][to_norm]
        elif to_norm in PUNJAB_DISTANCES and from_norm in PUNJAB_DISTANCES.get(to_norm, {}):
            distance = PUNJAB_DISTANCES[to_norm][from_norm]

        if distance is not None and distance > 0:
            # Pakistani highway avg effective speed: ~50 km/h (accounting for stops, tolls, city traffic)
            duration = int((distance / 50) * 60)
            return {
                "distance_km": float(distance),
                "duration_minutes": duration,
                "source": "local_matrix",
            }

        # Final fallback: Haversine
        from_coords = CITY_COORDS.get(from_norm)
        to_coords = CITY_COORDS.get(to_norm)
        if from_coords and to_coords:
            dist = haversine_distance(from_coords[0], from_coords[1], to_coords[0], to_coords[1])
            # Road distance in Pakistan is ~1.4x straight-line (winding roads, detours)
            road_dist = dist * 1.4
            # ~50 km/h effective speed
            duration = int((road_dist / 50) * 60)
            return {
                "distance_km": round(road_dist, 2),
                "duration_minutes": duration,
                "source": "haversine",
            }

        return None

    # ------------------------------------------------------------------
    # 4. Photographer Settings
    # ------------------------------------------------------------------
    def get_photographer_settings(self, photographer_id: str) -> Optional[Dict]:
        """Fetch photographer's travel preferences from DB."""
        try:
            resp = (
                supabase.table("photographer_travel_settings")
                .select("*")
                .eq("photographer_id", photographer_id)
                .limit(1)
                .execute()
            )
            return resp.data[0] if resp.data else None
        except Exception as e:
            logger.warning(f"Photographer settings lookup failed: {e}")
            return None

    def save_photographer_settings(self, photographer_id: str, settings: Dict) -> Dict:
        """Upsert photographer travel settings."""
        settings["photographer_id"] = photographer_id
        settings["last_updated"] = datetime.now(timezone.utc).isoformat()

        try:
            resp = (
                supabase.table("photographer_travel_settings")
                .upsert(settings, on_conflict="photographer_id")
                .execute()
            )
            return resp.data[0] if resp.data else settings
        except Exception as e:
            logger.error(f"Failed to save photographer settings: {e}")
            raise

    # ------------------------------------------------------------------
    # 5. CORE: Full Estimate Calculation (Round-Trip Only)
    # ------------------------------------------------------------------
    def calculate_estimate(
        self,
        from_city: str,
        to_city: str,
        photographer_id: Optional[str] = None,
        date: Optional[str] = None,
        event_duration_hours: float = 0,
        event_days: int = 1,
        requires_accommodation: bool = False,
    ) -> Dict[str, Any]:
        """
        Master estimate method. Follows the "Bus First, Calculate Second" strategy.

        Returns round-trip cost breakdown only (photographers need to return home).
        Checks photographer distance limits before calculating.
        
        Args:
            from_city: Origin city name
            to_city: Destination city name
            photographer_id: Optional photographer UUID for custom rates
            date: Optional event date (ISO format)
            event_duration_hours: Total event duration in hours (for single-day calculation)
            event_days: Number of days the event spans (e.g., 3 for a 3-day wedding)
            requires_accommodation: Explicitly request accommodation regardless of duration
        """
        from_city = from_city.strip().title()
        to_city = to_city.strip().title()

        # Same city = no travel cost
        if from_city == to_city:
            return self._zero_estimate(from_city, to_city)

        # --- Step A: Get distance & duration ---
        distance_data = self._resolve_distance(from_city, to_city)

        # --- Step B: Get photographer settings and check max distance ---
        photog_settings = None
        if photographer_id:
            photog_settings = self.get_photographer_settings(photographer_id)
            
            # Check max travel distance limit
            if photog_settings:
                max_distance = float(photog_settings.get("max_travel_distance_km", 500))
                if distance_data["distance_km"] > max_distance:
                    return {
                        "error": "distance_limit_exceeded",
                        "message": f"Photographer does not travel beyond {max_distance} km. Distance required: {distance_data['distance_km']:.0f} km",
                        "max_allowed_km": max_distance,
                        "requested_km": distance_data["distance_km"],
                    }

        # --- Step C: Get bus fare (primary source) ---
        bus_fare = self.get_bus_fare(from_city, to_city)

        # --- Step D: Build estimate ---
        return self._build_estimate(
            from_city=from_city,
            to_city=to_city,
            distance_data=distance_data,
            bus_fare=bus_fare,
            photog_settings=photog_settings,
            event_duration_hours=event_duration_hours,
            event_days=event_days,
            requires_accommodation=requires_accommodation,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------
    def _resolve_distance(self, from_city: str, to_city: str) -> Dict:
        """Resolve distance using: OSRM → Punjab Matrix → Haversine fallback."""
        
        # 1. Try OSRM (real routing via OSM data)
        osrm_result = self.fetch_osrm_distance(from_city, to_city)
        if osrm_result:
            logger.info(f"OSRM routing used for {from_city} → {to_city}")
            return osrm_result

        # 2. Local Punjab matrix or Haversine
        local = self.get_local_distance(from_city, to_city)
        if local:
            logger.info(f"Local distance source '{local['source']}' used for {from_city} → {to_city}")
            return local

        # 3. Absolute fallback: unknown cities — use rough average
        logger.warning(f"Using default estimate for {from_city} → {to_city}")
        return {
            "distance_km": 200,
            "duration_minutes": 240,
            "source": "default_estimate",
        }

    def _build_estimate(
        self,
        from_city: str,
        to_city: str,
        distance_data: Dict,
        bus_fare: Optional[Dict],
        photog_settings: Optional[Dict],
        event_duration_hours: float = 0,
        event_days: int = 1,
        requires_accommodation: bool = False,
    ) -> Dict[str, Any]:
        """
        Assemble the round-trip cost breakdown (photographers need to return home).
        
        Handles travel_mode_preference:
        - 'auto': Choose cheaper between bus fare and distance-based
        - 'public_transport': Prefer bus fare, fallback to distance-based
        - 'personal_vehicle': Always use distance-based calculation
        
        Accommodation logic:
        - Multi-day events: event_days > 1 → accommodation = (event_days - 1) nights
        - Single-day events: total_trip_hours > 12 → 1 night accommodation
        - Explicit request: requires_accommodation = True → 1 night minimum
        - Photographer preference: photog_settings.requires_accommodation → always add
        """

        distance_km = distance_data["distance_km"]
        duration_minutes = distance_data["duration_minutes"]
        duration_hours = duration_minutes / 60

        # Photographer-specific or default rates
        per_km = float(photog_settings["per_km_rate"]) if photog_settings else DEFAULT_PER_KM_RATE
        accommodation_fee = float(photog_settings["accommodation_fee"]) if photog_settings else DEFAULT_ACCOMMODATION_FEE
        min_charge = float(photog_settings["min_charge"]) if photog_settings else DEFAULT_MIN_CHARGE
        per_hour = float(photog_settings.get("per_hour_rate", 0)) if photog_settings else 0
        travel_mode_pref = (
            photog_settings.get("travel_mode_preference", "auto") 
            if photog_settings else "auto"
        )

        # Determine which cost source to use based on preference
        use_bus_fare = False
        source = "unknown"
        
        if travel_mode_pref == "personal_vehicle":
            # Always distance-based for personal vehicle
            use_bus_fare = False
            source = f"personal_vehicle_{distance_data['source']}"
        elif travel_mode_pref == "public_transport":
            # Prefer bus fare if available
            use_bus_fare = bool(bus_fare)
            if use_bus_fare:
                source = "bus_fare_public_transport"
            else:
                source = f"distance_based_public_transport_{distance_data['source']}"
        else:  # auto mode
            # Compare both and choose cheaper
            taxi_cost = _local_taxi_cost(distance_km)
            if bus_fare:
                # Calculate both options (round-trip)
                distance_cost = (max(distance_km * per_km, min_charge) * 2) + (taxi_cost * 2) + DEFAULT_HANDLING_FEE
                bus_cost = (bus_fare["one_way_amount"] * 2) + (taxi_cost * 2) + DEFAULT_HANDLING_FEE
                
                # Use bus fare if it's cheaper or equal
                use_bus_fare = bus_cost <= distance_cost
                source = "bus_fare_auto" if use_bus_fare else "distance_based_auto"
            else:
                use_bus_fare = False
                source = f"calculated_{distance_data['source']}"

        # ---------- ROUND-TRIP BREAKDOWN ----------
        breakdown_items: List[Dict] = []

        # Transport cost (round-trip)
        if use_bus_fare and bus_fare:
            breakdown_items.append({
                "label": f"Return Bus Fare ({bus_fare['provider']})",
                "amount": bus_fare["one_way_amount"] * 2,
            })
        else:
            # Distance-based calculation (round-trip)
            travel_allowance = max(distance_km * per_km, min_charge)
            breakdown_items.append({
                "label": "Return Travel Allowance",
                "amount": round(travel_allowance * 2, 0),
            })

        # Local taxi (both ways) — scales with distance
        taxi_per_way = _local_taxi_cost(distance_km)
        breakdown_items.append({
            "label": "Local Taxi (Both Ways)",
            "amount": taxi_per_way * 2,
        })

        # Hourly compensation (if set, for both ways)
        if per_hour > 0:
            breakdown_items.append({
                "label": "Hourly Travel Compensation (Both Ways)",
                "amount": round(duration_hours * per_hour * 2, 0),
            })

        # Handling fee
        breakdown_items.append({
            "label": "Handling Fee",
            "amount": DEFAULT_HANDLING_FEE,
        })

        # ---------- ACCOMMODATION LOGIC ----------
        # Smart accommodation calculation for real-world scenarios:
        # 1. Multi-day events (e.g., 3-day wedding) → charge for (event_days - 1) nights
        # 2. Single long day → if total trip time > 12 hours, add 1 night
        # 3. Photographer always requires accommodation → add nights based on event_days
        # 4. Client explicitly requests accommodation → add nights
        
        nights_needed = 0
        accommodation_reason = None
        
        # Check photographer's accommodation preference
        photog_requires_accom = photog_settings.get("requires_accommodation", False) if photog_settings else False
        
        if event_days > 1:
            # Multi-day event: photographer needs to stay (event_days - 1) nights
            # Example: 3-day wedding = 2 nights (arrive day 1, leave after day 3)
            nights_needed = event_days - 1
            accommodation_reason = f"{event_days}-day event"
        elif requires_accommodation or photog_requires_accom:
            # Explicitly requested or photographer requires it
            nights_needed = 1
            accommodation_reason = "requested" if requires_accommodation else "photographer preference"
        else:
            # Single-day event: check if trip is too long for same-day return
            total_trip_hours = (duration_hours * 2) + event_duration_hours
            if total_trip_hours > OVERNIGHT_THRESHOLD_HOURS:
                nights_needed = 1
                accommodation_reason = f"long trip ({total_trip_hours:.1f}h total)"
        
        # Add accommodation cost if needed
        if nights_needed > 0:
            total_accommodation = accommodation_fee * nights_needed
            breakdown_items.append({
                "label": f"Accommodation ({nights_needed} night{'s' if nights_needed > 1 else ''})",
                "amount": total_accommodation,
            })

        total_cost = sum(item["amount"] for item in breakdown_items)

        return {
            "from_city": from_city,
            "to_city": to_city,
            "source": source,
            "distance_km": round(distance_km, 1),
            "duration_minutes": int(duration_minutes),
            "duration_display": f"{int(duration_hours)}h {int(duration_minutes % 60)}m",
            "travel_mode_used": "public_transport" if use_bus_fare else "personal_vehicle",
            "travel_mode_preference": travel_mode_pref,
            "total_cost": round(total_cost, 0),
            "breakdown": breakdown_items,
            "accommodation": {
                "included": nights_needed > 0,
                "nights": nights_needed,
                "reason": accommodation_reason,
                "cost_per_night": accommodation_fee,
                "total_cost": accommodation_fee * nights_needed if nights_needed > 0 else 0,
            },
            "event_info": {
                "event_days": event_days,
                "event_duration_hours": event_duration_hours,
                "total_trip_hours": round((duration_hours * 2) + event_duration_hours, 1),
            },
            "photographer_rates": {
                "per_km_rate": per_km,
                "accommodation_fee": accommodation_fee,
                "min_charge": min_charge,
                "per_hour_rate": per_hour,
            } if photog_settings else None,
            "calculated_at": datetime.now(timezone.utc).isoformat(),
        }

    def _zero_estimate(self, from_city: str, to_city: str) -> Dict:
        """Return a zero-cost estimate for same-city bookings."""
        return {
            "from_city": from_city,
            "to_city": to_city,
            "source": "same_city",
            "distance_km": 0,
            "duration_minutes": 0,
            "duration_display": "0h 0m",
            "total_cost": 0,
            "breakdown": [],
            "accommodation": {
                "included": False,
                "nights": 0,
                "reason": None,
                "cost_per_night": 0,
                "total_cost": 0,
            },
            "event_info": {
                "event_days": 1,
                "event_duration_hours": 0,
                "total_trip_hours": 0,
            },
            "photographer_rates": None,
            "calculated_at": datetime.now(timezone.utc).isoformat(),
        }

    # ------------------------------------------------------------------
    # Utility: List available cities
    # ------------------------------------------------------------------
    def get_supported_cities(self) -> List[Dict]:
        """Return list of supported Punjab cities with coordinates."""
        cities = []
        for name, (lat, lng) in CITY_COORDS.items():
            cities.append({"name": name, "lat": lat, "lng": lng, "province": "Punjab"})
        return sorted(cities, key=lambda c: c["name"])

    # ------------------------------------------------------------------
    # Admin: Bus fare CRUD
    # ------------------------------------------------------------------
    def list_bus_fares(self, from_city: Optional[str] = None, to_city: Optional[str] = None) -> List[Dict]:
        """List all bus fares, optionally filtered by city."""
        try:
            query = supabase.table("intercity_bus_fares").select("*").order("from_city")
            if from_city:
                query = query.eq("from_city", from_city)
            if to_city:
                query = query.eq("to_city", to_city)
            resp = query.execute()
            return resp.data or []
        except Exception as e:
            logger.error(f"List bus fares failed: {e}")
            return []

    def create_bus_fare(self, data: Dict) -> Dict:
        """Create a new bus fare entry."""
        try:
            resp = supabase.table("intercity_bus_fares").insert(data).execute()
            return resp.data[0] if resp.data else data
        except Exception as e:
            logger.error(f"Create bus fare failed: {e}")
            raise

    def update_bus_fare(self, fare_id: int, data: Dict) -> Dict:
        """Update an existing bus fare."""
        try:
            data["last_updated"] = datetime.now(timezone.utc).isoformat()
            resp = supabase.table("intercity_bus_fares").update(data).eq("id", fare_id).execute()
            return resp.data[0] if resp.data else data
        except Exception as e:
            logger.error(f"Update bus fare failed: {e}")
            raise

    def delete_bus_fare(self, fare_id: int) -> bool:
        """Delete a bus fare entry."""
        try:
            supabase.table("intercity_bus_fares").delete().eq("id", fare_id).execute()
            return True
        except Exception as e:
            logger.error(f"Delete bus fare failed: {e}")
            return False


# Singleton instance
travel_cost_service = TravelCostService()
