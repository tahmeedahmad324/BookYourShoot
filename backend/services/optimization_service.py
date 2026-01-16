"""
MODULE 3: BOOKING OPTIMIZATION ENGINE (ILP - CORE FEATURE)
Uses Integer Linear Programming to select optimal photographer
"""

from typing import Dict, List, Optional
import pulp
from backend.services.photographer_data_service import photographer_data_engine


class BookingOptimizationEngine:
    """
    ILP-based photographer selection optimizer
    This is the STAR FEATURE of the platform
    """
    
    def __init__(self, alpha=0.4, beta=0.3, gamma=0.2, delta=0.1):
        """
        Initialize optimization engine with weights
        
        Args:
            alpha: Weight for rating (higher = prioritize rating)
            beta: Weight for price (higher = prioritize lower cost)
            gamma: Weight for travel cost (higher = prioritize proximity)
            delta: Weight for experience (higher = prioritize experience)
            
        Note: Weights should sum to 1.0 for interpretability
        """
        self.alpha = alpha  # Rating weight
        self.beta = beta    # Price weight
        self.gamma = gamma  # Travel cost weight
        self.delta = delta  # Experience weight
        
        # Validate weights
        total = alpha + beta + gamma + delta
        if abs(total - 1.0) > 0.01:
            print(f"Warning: Weights sum to {total}, not 1.0")
    
    def optimize(
        self,
        client_city: str,
        event_date: str,
        max_budget: float,
        gender_preference: Optional[str] = None,
        specialty: Optional[str] = None,
        top_k: int = 1
    ) -> Dict:
        """
        Run ILP optimization to select best photographer(s)
        
        Args:
            client_city: Client's city
            event_date: Event date
            max_budget: Maximum budget in PKR
            gender_preference: Optional gender filter
            specialty: Optional specialty filter
            top_k: Number of top photographers to return (default=1)
            
        Returns:
            Dictionary with:
                - selected_photographers: List of optimal photographer(s)
                - score_breakdown: Detailed scoring for explainability
                - solver_status: Optimization status
        """
        
        # Step 1: Fetch available photographers with normalized attributes
        photographers = photographer_data_engine.get_available_photographers(
            client_city=client_city,
            event_date=event_date,
            gender_preference=gender_preference,
            max_budget=max_budget,
            specialty=specialty
        )
        
        if not photographers:
            return {
                'success': False,
                'message': 'No photographers available matching your criteria',
                'selected_photographers': [],
                'score_breakdown': []
            }
        
        # Step 2: Create ILP problem
        prob = pulp.LpProblem("Photographer_Selection", pulp.LpMaximize)
        
        # Step 3: Decision variables (binary: selected or not)
        # x_i ∈ {0,1} for each photographer i
        x_vars = {}
        for i, photog in enumerate(photographers):
            var_name = f"x_{i}"
            x_vars[i] = pulp.LpVariable(var_name, cat='Binary')
        
        # Step 4: Objective function
        # Maximize: Σ (α·Rating_i - β·Cost_i - γ·TravelCost_i + δ·Experience_i) · x_i
        objective_terms = []
        for i, photog in enumerate(photographers):
            score = (
                self.alpha * photog['rating_norm'] +
                self.beta * photog['price_norm'] +  # Already inverted (lower price = higher score)
                self.gamma * (1.0 - photog['travel_cost_norm']) +  # Invert travel cost
                self.delta * photog['experience_norm']
            )
            objective_terms.append(score * x_vars[i])
        
        prob += pulp.lpSum(objective_terms), "Total_Score"
        
        # Step 5: Constraints
        
        # Constraint 1: Select exactly top_k photographers
        prob += pulp.lpSum([x_vars[i] for i in range(len(photographers))]) == top_k, "Select_K_Photographers"
        
        # Constraint 2: Availability must be 1 (already filtered, but explicitly check)
        for i, photog in enumerate(photographers):
            if photog['availability'] < 1.0:
                prob += x_vars[i] == 0, f"Availability_Constraint_{i}"
        
        # Constraint 3: Budget constraint (price must be <= max_budget)
        for i, photog in enumerate(photographers):
            if photog['price_raw'] > max_budget:
                prob += x_vars[i] == 0, f"Budget_Constraint_{i}"
        
        # Constraint 4: Gender preference (if specified)
        if gender_preference:
            for i, photog in enumerate(photographers):
                if photog['gender'].lower() != gender_preference.lower():
                    prob += x_vars[i] == 0, f"Gender_Constraint_{i}"
        
        # Step 6: Solve the ILP
        solver_status = prob.solve(pulp.PULP_CBC_CMD(msg=0))
        
        # Step 7: Extract results
        selected_photographers = []
        score_breakdown = []
        
        for i, photog in enumerate(photographers):
            if x_vars[i].varValue == 1:
                # Calculate individual score components for explainability
                rating_score = self.alpha * photog['rating_norm']
                price_score = self.beta * photog['price_norm']
                travel_score = self.gamma * (1.0 - photog['travel_cost_norm'])
                experience_score = self.delta * photog['experience_norm']
                total_score = rating_score + price_score + travel_score + experience_score
                
                photographer_result = {
                    'photographer_id': photog['photographer_id'],
                    'user_id': photog['user_id'],
                    'name': photog['name'],
                    'email': photog['email'],
                    'city': photog['city'],
                    'gender': photog['gender'],
                    'rating': photog['rating_raw'],
                    'experience_years': photog['experience_raw'],
                    'price': photog['price_raw'],
                    'travel_cost': photog['travel_cost_raw'],
                    'total_cost': photog['price_raw'] + photog['travel_cost_raw'],
                    
                    # Optimization scores (for viva demonstration)
                    'optimization_score': {
                        'total_score': round(total_score, 4),
                        'rating_contribution': round(rating_score, 4),
                        'price_contribution': round(price_score, 4),
                        'travel_contribution': round(travel_score, 4),
                        'experience_contribution': round(experience_score, 4),
                        'weights': {
                            'alpha_rating': self.alpha,
                            'beta_price': self.beta,
                            'gamma_travel': self.gamma,
                            'delta_experience': self.delta
                        }
                    }
                }
                
                selected_photographers.append(photographer_result)
                score_breakdown.append({
                    'photographer_name': photog['name'],
                    'total_score': round(total_score, 4),
                    'components': {
                        'rating': f"{photog['rating_raw']:.1f}/5.0 → {photog['rating_norm']:.3f} × {self.alpha} = {rating_score:.4f}",
                        'price': f"PKR {photog['price_raw']:.0f} → {photog['price_norm']:.3f} × {self.beta} = {price_score:.4f}",
                        'travel': f"PKR {photog['travel_cost_raw']:.0f} → {1.0 - photog['travel_cost_norm']:.3f} × {self.gamma} = {travel_score:.4f}",
                        'experience': f"{photog['experience_raw']} years → {photog['experience_norm']:.3f} × {self.delta} = {experience_score:.4f}"
                    }
                })
        
        # Sort by total score (descending)
        selected_photographers.sort(key=lambda x: x['optimization_score']['total_score'], reverse=True)
        
        return {
            'success': True,
            'selected_photographers': selected_photographers,
            'score_breakdown': score_breakdown,
            'solver_status': pulp.LpStatus[solver_status],
            'total_candidates': len(photographers),
            'optimization_method': 'Integer Linear Programming (ILP)',
            'message': 'Optimization completed successfully'
        }
    
    def explain_optimization(self, result: Dict) -> str:
        """
        Generate human-readable explanation of optimization results
        Perfect for viva demonstration
        """
        if not result.get('success'):
            return "Optimization failed: " + result.get('message', 'Unknown error')
        
        explanation = "🎯 OPTIMIZATION RESULTS (ILP-Based Selection)\n\n"
        explanation += f"Method: {result['optimization_method']}\n"
        explanation += f"Solver Status: {result['solver_status']}\n"
        explanation += f"Candidates Evaluated: {result['total_candidates']}\n\n"
        
        for i, photog in enumerate(result['selected_photographers'], 1):
            score = photog['optimization_score']
            explanation += f"{'='*60}\n"
            explanation += f"Rank #{i}: {photog['name']}\n"
            explanation += f"{'='*60}\n"
            explanation += f"Total Optimization Score: {score['total_score']:.4f}\n\n"
            
            explanation += "Score Breakdown:\n"
            explanation += f"  • Rating:     {score['rating_contribution']:.4f} (weight: {score['weights']['alpha_rating']})\n"
            explanation += f"  • Price:      {score['price_contribution']:.4f} (weight: {score['weights']['beta_price']})\n"
            explanation += f"  • Travel:     {score['travel_contribution']:.4f} (weight: {score['weights']['gamma_travel']})\n"
            explanation += f"  • Experience: {score['experience_contribution']:.4f} (weight: {score['weights']['delta_experience']})\n\n"
            
            explanation += f"Details:\n"
            explanation += f"  • Rating: {photog['rating']:.1f}/5.0\n"
            explanation += f"  • Experience: {photog['experience_years']} years\n"
            explanation += f"  • Event Price: PKR {photog['price']:.0f}\n"
            explanation += f"  • Travel Cost: PKR {photog['travel_cost']:.0f}\n"
            explanation += f"  • Total Cost: PKR {photog['total_cost']:.0f}\n"
            explanation += f"  • Location: {photog['city']}\n\n"
        
        return explanation


# Singleton instance with default weights
booking_optimizer = BookingOptimizationEngine(
    alpha=0.4,  # 40% weight on rating
    beta=0.3,   # 30% weight on price
    gamma=0.2,  # 20% weight on travel cost
    delta=0.1   # 10% weight on experience
)
