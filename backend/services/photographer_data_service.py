"""
MODULE 2: PHOTOGRAPHER PROFILE DATA ENGINE
Normalizes photographer attributes for ILP optimization
"""

from typing import Dict, List, Optional
from backend.supabase_client import supabase
from backend.data.punjab_travel_costs import get_travel_cost, normalize_travel_cost


class PhotographerDataEngine:
    """
    Handles photographer data normalization and preprocessing for optimization
    All attributes are normalized to 0-1 scale for fair comparison in ILP
    """
    
    def __init__(self):
        # Cache for min/max values (could be stored in DB for production)
        self.min_max_cache = {
            'rating': {'min': 0.0, 'max': 5.0},
            'experience': {'min': 0, 'max': 30},  # Years
            'price': {'min': 5000, 'max': 100000},  # PKR per event
        }
    
    def normalize_rating(self, rating: float) -> float:
        """Normalize rating to 0-1 scale"""
        min_val = self.min_max_cache['rating']['min']
        max_val = self.min_max_cache['rating']['max']
        
        if max_val == min_val:
            return 1.0
        
        normalized = (rating - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))
    
    def normalize_experience(self, years: int) -> float:
        """Normalize experience years to 0-1 scale"""
        min_val = self.min_max_cache['experience']['min']
        max_val = self.min_max_cache['experience']['max']
        
        if max_val == min_val:
            return 1.0
        
        normalized = (years - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))
    
    def normalize_price(self, price: float) -> float:
        """
        Normalize price to 0-1 scale
        Note: Lower price is better, so we invert this
        """
        min_val = self.min_max_cache['price']['min']
        max_val = self.min_max_cache['price']['max']
        
        if max_val == min_val:
            return 0.5
        
        normalized = (price - min_val) / (max_val - min_val)
        # Invert: 0 = expensive, 1 = cheap
        return max(0.0, min(1.0, 1.0 - normalized))
    
    def precompute_travel_cost(self, photographer_city: str, client_city: str) -> Dict[str, float]:
        """
        Precompute travel cost between photographer and client cities
        Returns both raw and normalized costs
        """
        raw_cost = get_travel_cost(photographer_city, client_city)
        normalized_cost = normalize_travel_cost(raw_cost)
        
        return {
            'raw_cost': raw_cost,
            'normalized_cost': normalized_cost  # 0 = no cost, 1 = max cost
        }
    
    def get_photographer_attributes(
        self, 
        photographer_id: str,
        client_city: str = None
    ) -> Optional[Dict]:
        """
        Fetch and normalize all photographer attributes
        
        Returns:
            Dictionary with raw and normalized attributes
        """
        try:
            # Fetch photographer profile with user data
            resp = supabase.table('photographer_profile').select(
                '''
                *,
                users!photographer_profile_user_id_fkey(
                    id, full_name, email, phone, city, gender
                )
                '''
            ).eq('id', photographer_id).limit(1).execute()
            
            if not resp.data:
                return None
            
            profile = resp.data[0]
            user = profile.get('users', {})
            
            # Extract raw attributes
            rating = float(profile.get('rating_avg', 0.0))
            experience = int(profile.get('experience_years', 0))
            price = float(profile.get('hourly_rate', 0.0)) * 8  # Convert hourly to per-event (8 hours)
            photographer_city = user.get('city', 'Lahore')
            gender = user.get('gender', '')
            verified = profile.get('verified', False)
            
            # Calculate travel cost if client city provided
            travel_data = {'raw_cost': 0.0, 'normalized_cost': 0.0}
            if client_city:
                travel_data = self.precompute_travel_cost(photographer_city, client_city)
            
            # Build normalized attributes dictionary
            attributes = {
                # Raw attributes
                'photographer_id': photographer_id,
                'user_id': user.get('id'),
                'name': user.get('full_name', ''),
                'email': user.get('email', ''),
                'city': photographer_city,
                'gender': gender,
                'verified': verified,
                'rating_raw': rating,
                'experience_raw': experience,
                'price_raw': price,
                'travel_cost_raw': travel_data['raw_cost'],
                
                # Normalized attributes (0-1 scale) for optimization
                'rating_norm': self.normalize_rating(rating),
                'experience_norm': self.normalize_experience(experience),
                'price_norm': self.normalize_price(price),
                'travel_cost_norm': travel_data['normalized_cost'],
                'availability': 1.0 if verified else 0.0,  # Binary availability
            }
            
            return attributes
            
        except Exception as e:
            print(f"Error fetching photographer attributes: {e}")
            return None
    
    def get_available_photographers(
        self,
        client_city: str,
        event_date: str,
        gender_preference: Optional[str] = None,
        max_budget: Optional[float] = None,
        specialty: Optional[str] = None
    ) -> List[Dict]:
        """
        Fetch all available photographers matching basic constraints
        Returns normalized attributes for each photographer
        
        Args:
            client_city: Client's city for travel cost calculation
            event_date: Event date to check availability
            gender_preference: Optional gender filter ('male', 'female')
            max_budget: Optional budget constraint
            specialty: Optional specialty filter
        """
        try:
            # Start with verified photographers
            query = supabase.table('photographer_profile').select(
                '''
                *,
                users!photographer_profile_user_id_fkey(
                    id, full_name, email, phone, city, gender
                )
                '''
            ).eq('verified', True)
            
            # Apply specialty filter if provided
            if specialty:
                query = query.contains('specialties', [specialty])
            
            resp = query.execute()
            
            photographers = []
            for profile in resp.data:
                user = profile.get('users', {})
                
                # Apply gender filter
                if gender_preference and user.get('gender', '').lower() != gender_preference.lower():
                    continue
                
                # Get normalized attributes
                photographer_id = profile['id']
                attributes = self.get_photographer_attributes(photographer_id, client_city)
                
                if not attributes:
                    continue
                
                # Apply budget constraint
                if max_budget and attributes['price_raw'] > max_budget:
                    continue
                
                photographers.append(attributes)
            
            return photographers
            
        except Exception as e:
            print(f"Error fetching available photographers: {e}")
            return []
    
    def update_min_max_cache(self):
        """
        Update min/max cache from database
        This should be called periodically or when new photographers are added
        """
        try:
            resp = supabase.table('photographer_profile').select(
                'rating_avg, experience_years, hourly_rate'
            ).execute()
            
            if not resp.data:
                return
            
            ratings = [float(p.get('rating_avg', 0)) for p in resp.data if p.get('rating_avg')]
            experiences = [int(p.get('experience_years', 0)) for p in resp.data if p.get('experience_years')]
            prices = [float(p.get('hourly_rate', 0)) * 8 for p in resp.data if p.get('hourly_rate')]
            
            if ratings:
                self.min_max_cache['rating'] = {'min': min(ratings), 'max': max(ratings)}
            if experiences:
                self.min_max_cache['experience'] = {'min': min(experiences), 'max': max(experiences)}
            if prices:
                self.min_max_cache['price'] = {'min': min(prices), 'max': max(prices)}
            
        except Exception as e:
            print(f"Error updating min/max cache: {e}")


# Singleton instance
photographer_data_engine = PhotographerDataEngine()
