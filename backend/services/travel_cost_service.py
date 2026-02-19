"""
Travel Cost Estimation Service
==============================
Implements the "Bus First, Calculate Second" hybrid strategy:
  1. Check intercity_bus_fares table for predefined fares
  2. Check travel_estimates_cache for cached distance data
    3. Fallback to Google Maps Distance Matrix API (or OSRM)
    4. If still missing, use Punjab matrix or Haversine fallback
    5. Apply photographer-specific rates & overheads
    6. Return one-way and round-trip breakdowns
"""

import math
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List

import httpx

from backend.supabase_client import supabase
from backend.data.punjab_travel_costs import PUNJAB_DISTANCES, ALL_CITIES

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
OSRM_BASE_URL = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org")
CACHE_EXPIRY_DAYS = 7

# Default overhead costs (PKR)
DEFAULT_LOCAL_TAXI_COST = 800       # Taxi to/from bus terminal
DEFAULT_HANDLING_FEE = 500          # Misc handling/booking fee
DEFAULT_PER_KM_RATE = 30            # PKR per km (personal car)
DEFAULT_ACCOMMODATION_FEE = 3000    # Per night
DEFAULT_MIN_CHARGE = 500
OVERNIGHT_THRESHOLD_HOURS = 6       # If trip > 6 hours, add accommodation

# Punjab city coordinates for Haversine fallback
CITY_COORDS = {
    "Lahore":          (31.5204, 74.3587),
    "Faisalabad":      (31.4504, 73.1350),
    "Rawalpindi":      (33.5651, 73.0169),
    "Islamabad":       (33.6844, 73.0479),
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
    # 2. Cache Layer
    # ------------------------------------------------------------------
    def get_cached_distance(self, from_city: str, to_city: str, mode: str = "driving") -> Optional[Dict]:
        """Check cache for a previously computed distance/duration."""
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            resp = (
                supabase.table("travel_estimates_cache")
                .select("*")
                .eq("from_city", from_city)
                .eq("to_city", to_city)
                .eq("mode", mode)
                .gte("expires_at", now_iso)
                .order("cached_at", desc=True)
                .limit(1)
                .execute()
            )
            if resp.data:
                row = resp.data[0]
                return {
                    "distance_km": float(row["distance_km"]),
                    "duration_minutes": int(row["duration_minutes"]),
                    "source": row["source"],
                }
            # Try reverse direction
            resp2 = (
                supabase.table("travel_estimates_cache")
                .select("*")
                .eq("from_city", to_city)
                .eq("to_city", from_city)
                .eq("mode", mode)
                .gte("expires_at", now_iso)
                .order("cached_at", desc=True)
                .limit(1)
                .execute()
            )
            if resp2.data:
                row = resp2.data[0]
                return {
                    "distance_km": float(row["distance_km"]),
                    "duration_minutes": int(row["duration_minutes"]),
                    "source": row["source"],
                }
            return None
        except Exception as e:
            logger.warning(f"Cache lookup failed: {e}")
            return None

    def save_to_cache(self, from_city: str, to_city: str, mode: str,
                      distance_km: float, duration_minutes: int, source: str,
                      raw_response: dict = None):
        """Persist distance/duration to cache."""
        try:
            expires = (datetime.now(timezone.utc) + timedelta(days=CACHE_EXPIRY_DAYS)).isoformat()
            supabase.table("travel_estimates_cache").insert({
                "from_city": from_city,
                "to_city": to_city,
                "mode": mode,
                "distance_km": distance_km,
                "duration_minutes": duration_minutes,
                "source": source,
                "raw_response": raw_response or {},
                "expires_at": expires,
            }).execute()
        except Exception as e:
            logger.warning(f"Cache save failed: {e}")

    # ------------------------------------------------------------------
    # 3. Google Maps Distance Matrix API
    # ------------------------------------------------------------------
    def fetch_google_distance(self, from_city: str, to_city: str, mode: str = "driving") -> Optional[Dict]:
        """
        Call Google Maps Distance Matrix API.
        Returns distance_km & duration_minutes or None.
        """
        if not GOOGLE_MAPS_API_KEY:
            return None

        try:
            url = "https://maps.googleapis.com/maps/api/distancematrix/json"
            params = {
                "origins": f"{from_city}, Pakistan",
                "destinations": f"{to_city}, Pakistan",
                "mode": mode,
                "key": GOOGLE_MAPS_API_KEY,
            }
            with httpx.Client(timeout=10) as client:
                resp = client.get(url, params=params)
                data = resp.json()

            if data.get("status") != "OK":
                logger.warning(f"Google Maps API error: {data.get('status')}")
                return None

            element = data["rows"][0]["elements"][0]
            if element.get("status") != "OK":
                return None

            distance_km = element["distance"]["value"] / 1000
            duration_minutes = element["duration"]["value"] // 60

            # Cache for later
            self.save_to_cache(from_city, to_city, mode, distance_km, duration_minutes, "google", data)

            return {
                "distance_km": round(distance_km, 2),
                "duration_minutes": duration_minutes,
                "source": "google",
            }
        except Exception as e:
            logger.warning(f"Google Maps API call failed: {e}")
            return None

    # ------------------------------------------------------------------
    # 3b. OSRM (OpenStreetMap routing) fallback
    # ------------------------------------------------------------------
    def fetch_osrm_distance(self, from_city: str, to_city: str) -> Optional[Dict]:
        """
        Call OSRM public routing API using city coordinates.
        Returns distance_km & duration_minutes or None.
        """
        from_coords = CITY_COORDS.get(from_city)
        to_coords = CITY_COORDS.get(to_city)
        if not from_coords or not to_coords:
            return None

        try:
            url = (
                f"{OSRM_BASE_URL}/route/v1/driving/"
                f"{from_coords[1]},{from_coords[0]};{to_coords[1]},{to_coords[0]}"
            )
            params = {"overview": "false"}
            with httpx.Client(timeout=10) as client:
                resp = client.get(url, params=params)
                data = resp.json()

            if data.get("code") != "Ok":
                logger.warning(f"OSRM API error: {data.get('code')}")
                return None

            route = data["routes"][0]
            distance_km = route["distance"] / 1000
            duration_minutes = int(route["duration"] // 60)

            self.save_to_cache(from_city, to_city, "driving", distance_km, duration_minutes, "osrm", data)

            return {
                "distance_km": round(distance_km, 2),
                "duration_minutes": duration_minutes,
                "source": "osrm",
            }
        except Exception as e:
            logger.warning(f"OSRM API call failed: {e}")
            return None

    # ------------------------------------------------------------------
    # 4. Punjab Distance Matrix Fallback
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
            # Estimate duration: avg 60 km/h on Pakistani highways, +20% buffer
            duration = int((distance / 60) * 1.2 * 60)
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
            # Road distance is ~1.3x straight-line
            road_dist = dist * 1.3
            duration = int((road_dist / 60) * 1.2 * 60)
            return {
                "distance_km": round(road_dist, 2),
                "duration_minutes": duration,
                "source": "haversine",
            }

        return None

    # ------------------------------------------------------------------
    # 5. Photographer Settings
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
    # 6. CORE: Full Estimate Calculation
    # ------------------------------------------------------------------
    def calculate_estimate(
        self,
        from_city: str,
        to_city: str,
        photographer_id: Optional[str] = None,
        date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Master estimate method. Follows the "Bus First, Calculate Second" strategy.

        Returns a full estimate with one_way and round_trip breakdowns.
        """
        from_city = from_city.strip().title()
        to_city = to_city.strip().title()

        # Same city = no travel cost
        if from_city == to_city:
            return self._zero_estimate(from_city, to_city)

        # --- Step A: Get distance & duration ---
        distance_data = self._resolve_distance(from_city, to_city)

        # --- Step B: Get bus fare (primary source) ---
        bus_fare = self.get_bus_fare(from_city, to_city)

        # --- Step C: Get photographer settings ---
        photog_settings = None
        if photographer_id:
            photog_settings = self.get_photographer_settings(photographer_id)

        # --- Step D: Build estimate ---
        return self._build_estimate(
            from_city=from_city,
            to_city=to_city,
            distance_data=distance_data,
            bus_fare=bus_fare,
            photog_settings=photog_settings,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------
    def _resolve_distance(self, from_city: str, to_city: str) -> Dict:
        """Resolve distance using: Cache → Google → OSRM → Local Matrix → Haversine."""
        # 1. Cache
        cached = self.get_cached_distance(from_city, to_city)
        if cached:
            logger.info(f"Cache HIT for {from_city}->{to_city}")
            return cached

        logger.info(f"Cache MISS for {from_city}->{to_city}")

        # 2. Google Maps
        google_result = self.fetch_google_distance(from_city, to_city)
        if google_result:
            return google_result

        # 3. OSRM
        osrm_result = self.fetch_osrm_distance(from_city, to_city)
        if osrm_result:
            return osrm_result

        # 4. Local matrix / Haversine
        local = self.get_local_distance(from_city, to_city)
        if local:
            # Also cache this for consistency
            self.save_to_cache(
                from_city, to_city, "driving",
                local["distance_km"], local["duration_minutes"], local["source"]
            )
            return local

        # Absolute fallback: unknown cities — use rough average
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
    ) -> Dict[str, Any]:
        """Assemble the full cost breakdown."""

        distance_km = distance_data["distance_km"]
        duration_minutes = distance_data["duration_minutes"]
        duration_hours = duration_minutes / 60

        # Photographer-specific or default rates
        per_km = float(photog_settings["per_km_rate"]) if photog_settings else DEFAULT_PER_KM_RATE
        accommodation_fee = float(photog_settings["accommodation_fee"]) if photog_settings else DEFAULT_ACCOMMODATION_FEE
        min_charge = float(photog_settings["min_charge"]) if photog_settings else DEFAULT_MIN_CHARGE
        per_hour = float(photog_settings.get("per_hour_rate", 0)) if photog_settings else 0

        # ---------- ONE-WAY BREAKDOWN ----------
        one_way_items: List[Dict] = []

        if bus_fare:
            # Primary: use known bus fare
            source = "manual_bus_fare"
            one_way_items.append({
                "label": f"Bus Fare ({bus_fare['provider']})",
                "amount": bus_fare["one_way_amount"],
            })
        else:
            # Secondary: distance-based calculation
            source = f"calculated_{distance_data['source']}"
            travel_allowance = max(distance_km * per_km, min_charge)
            one_way_items.append({
                "label": "Travel Allowance (distance-based)",
                "amount": round(travel_allowance, 0),
            })

        # Local taxi to terminal / pickup-drop
        one_way_items.append({
            "label": "Local Taxi (Pickup/Drop)",
            "amount": DEFAULT_LOCAL_TAXI_COST,
        })

        # Hourly compensation (if set)
        if per_hour > 0:
            hourly_comp = round(duration_hours * per_hour, 0)
            one_way_items.append({
                "label": "Hourly Travel Compensation",
                "amount": hourly_comp,
            })

        # Handling fee
        one_way_items.append({
            "label": "Handling Fee",
            "amount": DEFAULT_HANDLING_FEE,
        })

        one_way_total = sum(item["amount"] for item in one_way_items)

        # ---------- ROUND-TRIP BREAKDOWN ----------
        round_trip_items: List[Dict] = []

        # Double the transport cost
        if bus_fare:
            round_trip_items.append({
                "label": f"Return Bus Fare ({bus_fare['provider']})",
                "amount": bus_fare["one_way_amount"] * 2,
            })
        else:
            travel_allowance = max(distance_km * per_km, min_charge)
            round_trip_items.append({
                "label": "Return Travel Allowance",
                "amount": round(travel_allowance * 2, 0),
            })

        round_trip_items.append({
            "label": "Local Taxi (Both Ways)",
            "amount": DEFAULT_LOCAL_TAXI_COST * 2,
        })

        if per_hour > 0:
            round_trip_items.append({
                "label": "Hourly Travel Compensation (Both Ways)",
                "amount": round(duration_hours * per_hour * 2, 0),
            })

        round_trip_items.append({
            "label": "Handling Fee",
            "amount": DEFAULT_HANDLING_FEE,
        })

        # Accommodation if trip is long
        needs_overnight = duration_hours > OVERNIGHT_THRESHOLD_HOURS
        requires_accom = photog_settings.get("requires_accommodation", False) if photog_settings else False
        if needs_overnight or requires_accom:
            round_trip_items.append({
                "label": "Overnight Accommodation",
                "amount": accommodation_fee,
            })

        round_trip_total = sum(item["amount"] for item in round_trip_items)

        return {
            "from_city": from_city,
            "to_city": to_city,
            "source": source,
            "distance_km": round(distance_km, 1),
            "duration_minutes": int(duration_minutes),
            "duration_display": f"{int(duration_hours)}h {int(duration_minutes % 60)}m",
            "estimates": {
                "one_way": {
                    "total": round(one_way_total, 0),
                    "breakdown": one_way_items,
                },
                "round_trip": {
                    "total": round(round_trip_total, 0),
                    "breakdown": round_trip_items,
                },
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
            "estimates": {
                "one_way": {"total": 0, "breakdown": []},
                "round_trip": {"total": 0, "breakdown": []},
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

    # ------------------------------------------------------------------
    # Cache management
    # ------------------------------------------------------------------
    def clear_expired_cache(self) -> int:
        """Remove expired cache entries. Returns count removed."""
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            resp = supabase.table("travel_estimates_cache").delete().lt("expires_at", now_iso).execute()
            count = len(resp.data) if resp.data else 0
            logger.info(f"Cleared {count} expired cache entries")
            return count
        except Exception as e:
            logger.warning(f"Cache cleanup failed: {e}")
            return 0

    def get_cache_stats(self) -> Dict:
        """Return cache statistics for admin dashboard."""
        try:
            all_entries = supabase.table("travel_estimates_cache").select("id, source, expires_at", count="exact").execute()
            now_iso = datetime.now(timezone.utc).isoformat()
            active = supabase.table("travel_estimates_cache").select("id", count="exact").gte("expires_at", now_iso).execute()
            return {
                "total_entries": len(all_entries.data) if all_entries.data else 0,
                "active_entries": len(active.data) if active.data else 0,
                "expired_entries": (len(all_entries.data) if all_entries.data else 0) - (len(active.data) if active.data else 0),
            }
        except Exception as e:
            return {"total_entries": 0, "active_entries": 0, "expired_entries": 0}


# Singleton instance
travel_cost_service = TravelCostService()
