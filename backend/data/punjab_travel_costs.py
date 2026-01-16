"""
Punjab Travel Cost Matrix
Distance-based travel cost estimates between major cities in Punjab
Costs are in PKR, based on approximate distances and travel expenses
"""

# Distance matrix in kilometers between major Punjab cities
PUNJAB_DISTANCES = {
    "Lahore": {
        "Lahore": 0,
        "Faisalabad": 130,
        "Rawalpindi": 375,
        "Multan": 340,
        "Gujranwala": 80,
        "Sialkot": 125,
        "Bahawalpur": 400,
        "Sargodha": 180,
        "Shekhupura": 50,
        "Jhang": 210,
        "Rahim Yar Khan": 470,
        "Gujrat": 160,
        "Kasur": 55,
        "Sahiwal": 170,
        "Okara": 110,
        "Wah Cantt": 360,
        "Dera Ghazi Khan": 420,
        "Mirpur Khas": 500,
        "Kamoke": 60,
        "Jhelum": 285,
    },
    "Faisalabad": {
        "Lahore": 130,
        "Faisalabad": 0,
        "Rawalpindi": 280,
        "Multan": 210,
        "Gujranwala": 150,
        "Sialkot": 200,
        "Bahawalpur": 320,
        "Sargodha": 90,
        "Shekhupura": 110,
        "Jhang": 85,
        "Rahim Yar Khan": 400,
        "Gujrat": 220,
        "Kasur": 160,
        "Sahiwal": 95,
        "Okara": 120,
        "Wah Cantt": 260,
        "Dera Ghazi Khan": 350,
        "Mirpur Khas": 480,
        "Kamoke": 140,
        "Jhelum": 240,
    },
    "Rawalpindi": {
        "Lahore": 375,
        "Faisalabad": 280,
        "Rawalpindi": 0,
        "Multan": 560,
        "Gujranwala": 320,
        "Sialkot": 260,
        "Bahawalpur": 650,
        "Sargodha": 230,
        "Shekhupura": 340,
        "Jhang": 340,
        "Rahim Yar Khan": 720,
        "Gujrat": 110,
        "Kasur": 410,
        "Sahiwal": 370,
        "Okara": 390,
        "Wah Cantt": 30,
        "Dera Ghazi Khan": 580,
        "Mirpur Khas": 780,
        "Kamoke": 330,
        "Jhelum": 95,
    },
    "Multan": {
        "Lahore": 340,
        "Faisalabad": 210,
        "Rawalpindi": 560,
        "Multan": 0,
        "Gujranwala": 380,
        "Sialkot": 430,
        "Bahawalpur": 110,
        "Sargodha": 280,
        "Shekhupura": 320,
        "Jhang": 165,
        "Rahim Yar Khan": 185,
        "Gujrat": 480,
        "Kasur": 310,
        "Sahiwal": 145,
        "Okara": 230,
        "Wah Cantt": 540,
        "Dera Ghazi Khan": 220,
        "Mirpur Khas": 290,
        "Kamoke": 370,
        "Jhelum": 520,
    },
    "Gujranwala": {
        "Lahore": 80,
        "Faisalabad": 150,
        "Rawalpindi": 320,
        "Multan": 380,
        "Gujranwala": 0,
        "Sialkot": 70,
        "Bahawalpur": 450,
        "Sargodha": 120,
        "Shekhupura": 50,
        "Jhang": 190,
        "Rahim Yar Khan": 520,
        "Gujrat": 90,
        "Kasur": 110,
        "Sahiwal": 210,
        "Okara": 150,
        "Wah Cantt": 300,
        "Dera Ghazi Khan": 460,
        "Mirpur Khas": 550,
        "Kamoke": 30,
        "Jhelum": 230,
    },
    "Sialkot": {
        "Lahore": 125,
        "Faisalabad": 200,
        "Rawalpindi": 260,
        "Multan": 430,
        "Gujranwala": 70,
        "Sialkot": 0,
        "Bahawalpur": 500,
        "Sargodha": 180,
        "Shekhupura": 100,
        "Jhang": 250,
        "Rahim Yar Khan": 570,
        "Gujrat": 140,
        "Kasur": 150,
        "Sahiwal": 260,
        "Okara": 200,
        "Wah Cantt": 240,
        "Dera Ghazi Khan": 510,
        "Mirpur Khas": 600,
        "Kamoke": 90,
        "Jhelum": 180,
    },
}

# Default cities - add all major Punjab cities as keys
ALL_CITIES = list(set(PUNJAB_DISTANCES.keys()))

# Travel cost per kilometer (in PKR)
COST_PER_KM = 15.0  # Includes fuel, toll, wear and tear

# Base travel cost (fixed cost for any travel)
BASE_TRAVEL_COST = 500.0  # PKR


def get_travel_cost(from_city: str, to_city: str) -> float:
    """
    Calculate travel cost between two cities in Punjab
    
    Args:
        from_city: Origin city name
        to_city: Destination city name
        
    Returns:
        Travel cost in PKR
    """
    # Normalize city names (case-insensitive)
    from_city = from_city.strip().title()
    to_city = to_city.strip().title()
    
    # Same city, no travel cost
    if from_city == to_city:
        return 0.0
    
    # Get distance from matrix
    distance = 0
    if from_city in PUNJAB_DISTANCES and to_city in PUNJAB_DISTANCES[from_city]:
        distance = PUNJAB_DISTANCES[from_city][to_city]
    elif to_city in PUNJAB_DISTANCES and from_city in PUNJAB_DISTANCES[to_city]:
        distance = PUNJAB_DISTANCES[to_city][from_city]
    else:
        # Default distance for unknown cities (approximate average)
        distance = 200
    
    # Calculate cost: base cost + distance-based cost
    travel_cost = BASE_TRAVEL_COST + (distance * COST_PER_KM)
    
    return travel_cost


def get_max_travel_cost() -> float:
    """Get maximum possible travel cost in the system"""
    max_distance = 0
    for city_distances in PUNJAB_DISTANCES.values():
        max_distance = max(max_distance, max(city_distances.values()))
    return BASE_TRAVEL_COST + (max_distance * COST_PER_KM)


def normalize_travel_cost(cost: float) -> float:
    """
    Normalize travel cost to 0-1 scale
    
    Args:
        cost: Travel cost in PKR
        
    Returns:
        Normalized cost (0-1)
    """
    max_cost = get_max_travel_cost()
    if max_cost == 0:
        return 0.0
    return min(cost / max_cost, 1.0)
