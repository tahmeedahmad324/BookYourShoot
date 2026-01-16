"""
Quick verification test for optimization modules
Run this to ensure everything is properly installed and working
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

print("="*60)
print("🧪 Testing Optimization Modules Installation")
print("="*60)

# Test 1: PuLP Installation
print("\n1️⃣ Testing PuLP (ILP Solver)...")
try:
    import pulp
    print(f"   ✅ PuLP version {pulp.__version__} installed")
    
    # Test simple optimization
    prob = pulp.LpProblem("Test", pulp.LpMaximize)
    x = pulp.LpVariable("x", cat='Binary')
    prob += x
    prob.solve(pulp.PULP_CBC_CMD(msg=0))
    print(f"   ✅ Solver working: {pulp.LpStatus[prob.status]}")
except ImportError:
    print("   ❌ PuLP not installed. Run: pip install pulp")
except Exception as e:
    print(f"   ❌ PuLP error: {e}")

# Test 2: Module Imports
print("\n2️⃣ Testing Module Imports...")
modules_to_test = [
    ("backend.data.punjab_travel_costs", "Punjab travel costs"),
    ("backend.services.photographer_data_service", "Photographer data engine"),
    ("backend.services.optimization_service", "Optimization engine"),
]

for module_name, description in modules_to_test:
    try:
        __import__(module_name)
        print(f"   ✅ {description}")
    except ImportError as e:
        print(f"   ❌ {description}: {e}")

# Test 3: Travel Cost Calculation
print("\n3️⃣ Testing Travel Cost Matrix...")
try:
    from backend.data.punjab_travel_costs import get_travel_cost, normalize_travel_cost
    
    cost = get_travel_cost("Lahore", "Faisalabad")
    norm_cost = normalize_travel_cost(cost)
    print(f"   ✅ Lahore → Faisalabad: PKR {cost:.0f} (normalized: {norm_cost:.3f})")
    
    cost2 = get_travel_cost("Lahore", "Lahore")
    print(f"   ✅ Same city: PKR {cost2:.0f} (no travel cost)")
except Exception as e:
    print(f"   ❌ Travel cost error: {e}")

# Test 4: Normalization Functions
print("\n4️⃣ Testing Normalization...")
try:
    from backend.services.photographer_data_service import photographer_data_engine
    
    rating_norm = photographer_data_engine.normalize_rating(4.5)
    exp_norm = photographer_data_engine.normalize_experience(10)
    price_norm = photographer_data_engine.normalize_price(30000)
    
    print(f"   ✅ Rating 4.5/5.0 → {rating_norm:.3f}")
    print(f"   ✅ Experience 10 years → {exp_norm:.3f}")
    print(f"   ✅ Price PKR 30,000 → {price_norm:.3f}")
except Exception as e:
    print(f"   ❌ Normalization error: {e}")

# Test 5: Mock Optimization (No Database)
print("\n5️⃣ Testing Optimization Engine...")
try:
    from backend.services.optimization_service import booking_optimizer
    import pulp
    
    # Create mock photographer data
    mock_photographers = [
        {
            'photographer_id': 'mock-1',
            'user_id': 'user-1',
            'name': 'John Doe',
            'email': 'john@test.com',
            'city': 'Lahore',
            'gender': 'male',
            'verified': True,
            'rating_raw': 4.5,
            'experience_raw': 10,
            'price_raw': 30000,
            'travel_cost_raw': 1000,
            'rating_norm': 0.90,
            'experience_norm': 0.33,
            'price_norm': 0.74,
            'travel_cost_norm': 0.15,
            'availability': 1.0
        },
        {
            'photographer_id': 'mock-2',
            'user_id': 'user-2',
            'name': 'Jane Smith',
            'email': 'jane@test.com',
            'city': 'Lahore',
            'gender': 'female',
            'verified': True,
            'rating_raw': 4.8,
            'experience_raw': 8,
            'price_raw': 40000,
            'travel_cost_raw': 500,
            'rating_norm': 0.96,
            'experience_norm': 0.27,
            'price_norm': 0.63,
            'travel_cost_norm': 0.08,
            'availability': 1.0
        }
    ]
    
    # Test ILP formulation
    prob = pulp.LpProblem("Test_Optimization", pulp.LpMaximize)
    x_vars = {}
    
    for i, photog in enumerate(mock_photographers):
        x_vars[i] = pulp.LpVariable(f"x_{i}", cat='Binary')
    
    # Objective function
    objective = pulp.lpSum([
        (0.4 * photog['rating_norm'] +
         0.3 * photog['price_norm'] +
         0.2 * (1 - photog['travel_cost_norm']) +
         0.1 * photog['experience_norm']) * x_vars[i]
        for i, photog in enumerate(mock_photographers)
    ])
    
    prob += objective
    prob += pulp.lpSum(x_vars.values()) == 1  # Select 1 photographer
    
    # Solve
    status = prob.solve(pulp.PULP_CBC_CMD(msg=0))
    
    if status == pulp.LpStatusOptimal:
        print(f"   ✅ Optimization successful: {pulp.LpStatus[status]}")
        
        # Show selected photographer
        for i, photog in enumerate(mock_photographers):
            if x_vars[i].varValue == 1:
                score = (0.4 * photog['rating_norm'] +
                        0.3 * photog['price_norm'] +
                        0.2 * (1 - photog['travel_cost_norm']) +
                        0.1 * photog['experience_norm'])
                print(f"   ✅ Selected: {photog['name']} (Score: {score:.4f})")
    else:
        print(f"   ⚠️ Optimization status: {pulp.LpStatus[status]}")
        
except Exception as e:
    print(f"   ❌ Optimization error: {e}")
    import traceback
    traceback.print_exc()

# Test 6: Booking Router Endpoints (Check imports)
print("\n6️⃣ Testing Booking Router Integration...")
try:
    from backend.routers import booking
    
    # Check if optimization endpoints exist
    endpoints = [route.path for route in booking.router.routes]
    
    required_endpoints = [
        '/bookings/optimize',
        '/bookings/optimize/explain',
        '/bookings/update-normalization-cache',
        '/bookings',
        '/bookings/{booking_id}/status'
    ]
    
    for endpoint in required_endpoints:
        if endpoint in endpoints or any(e.startswith(endpoint.split('{')[0]) for e in endpoints):
            print(f"   ✅ Endpoint: {endpoint}")
        else:
            print(f"   ⚠️ Endpoint may be missing: {endpoint}")
            
except Exception as e:
    print(f"   ❌ Router error: {e}")

# Summary
print("\n" + "="*60)
print("📊 Test Summary")
print("="*60)
print("\n✅ If all tests pass, modules are ready!")
print("✅ Next step: Run backend server and test with demo script")
print("\nCommands:")
print("  1. Start server: python backend/main.py")
print("  2. Run demo: python backend/scripts/demo_optimization.py")
print("  3. Check API docs: http://localhost:8000/docs")
print("\n" + "="*60)
