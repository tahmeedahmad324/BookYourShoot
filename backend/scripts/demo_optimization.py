"""
DEMO SCRIPT FOR MODULES 2, 3, AND 4
Test the photographer optimization and booking workflow
"""

import requests
import json
from datetime import datetime, timedelta

# Backend API base URL
BASE_URL = "http://localhost:8000"

# Demo credentials (update with actual test user)
CLIENT_EMAIL = "client@test.com"
CLIENT_PASSWORD = "password123"

print("="*80)
print("📸 BookYourShoot - ILP OPTIMIZATION DEMO")
print("="*80)
print()

def login(email, password):
    """Login and get auth token"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get('token') or data.get('access_token')
            print(f"✅ Logged in as: {email}")
            return token
        else:
            print(f"❌ Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None


def demo_optimization(token):
    """Demonstrate MODULE 3: ILP Optimization"""
    print("\n" + "="*80)
    print("🎯 MODULE 3: ILP OPTIMIZATION ENGINE DEMO")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test case 1: Basic optimization
    print("\n📊 Test Case 1: Basic Optimization")
    print("-" * 60)
    
    optimization_request = {
        "client_city": "Lahore",
        "event_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
        "max_budget": 50000,
        "gender_preference": None,
        "specialty": None,
        "top_k": 3  # Get top 3 photographers
    }
    
    print(f"Request Parameters:")
    print(f"  • Client City: {optimization_request['client_city']}")
    print(f"  • Event Date: {optimization_request['event_date']}")
    print(f"  • Max Budget: PKR {optimization_request['max_budget']:,}")
    print(f"  • Top K: {optimization_request['top_k']}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/bookings/optimize",
            json=optimization_request,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ Optimization Successful!")
            print(f"Method: {result['data']['optimization_method']}")
            print(f"Solver Status: {result['data']['solver_status']}")
            print(f"Candidates Evaluated: {result['data']['total_candidates']}")
            print(f"\n🏆 Top {len(result['data']['selected_photographers'])} Photographer(s):")
            
            for i, photog in enumerate(result['data']['selected_photographers'], 1):
                print(f"\n  Rank #{i}: {photog['name']}")
                print(f"  {'='*56}")
                score = photog['optimization_score']
                print(f"  📊 Total Score: {score['total_score']:.4f}")
                print(f"  ⭐ Rating: {photog['rating']:.1f}/5.0 (contrib: {score['rating_contribution']:.4f})")
                print(f"  💰 Price: PKR {photog['price']:,.0f} (contrib: {score['price_contribution']:.4f})")
                print(f"  🚗 Travel: PKR {photog['travel_cost']:,.0f} (contrib: {score['travel_contribution']:.4f})")
                print(f"  📅 Experience: {photog['experience_years']} years (contrib: {score['experience_contribution']:.4f})")
                print(f"  📍 Location: {photog['city']}")
                print(f"  💵 Total Cost: PKR {photog['total_cost']:,.0f}")
            
            # Return best photographer for booking demo
            return result['data']['selected_photographers'][0] if result['data']['selected_photographers'] else None
        else:
            print(f"❌ Optimization failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def demo_optimization_with_filters(token):
    """Demonstrate optimization with gender and specialty filters"""
    print("\n" + "="*80)
    print("🎯 MODULE 3: OPTIMIZATION WITH FILTERS")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n📊 Test Case 2: Optimization with Gender Preference")
    print("-" * 60)
    
    optimization_request = {
        "client_city": "Faisalabad",
        "event_date": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d"),
        "max_budget": 80000,
        "gender_preference": "female",
        "specialty": "Wedding",
        "top_k": 2
    }
    
    print(f"Request Parameters:")
    print(f"  • Client City: {optimization_request['client_city']}")
    print(f"  • Max Budget: PKR {optimization_request['max_budget']:,}")
    print(f"  • Gender Preference: {optimization_request['gender_preference']}")
    print(f"  • Specialty: {optimization_request['specialty']}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/bookings/optimize",
            json=optimization_request,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ Filtered Optimization Successful!")
            print(f"Candidates Found: {result['data']['total_candidates']}")
            
            if result['data']['selected_photographers']:
                for i, photog in enumerate(result['data']['selected_photographers'], 1):
                    print(f"\n  Rank #{i}: {photog['name']} ({photog['gender']})")
                    print(f"  Score: {photog['optimization_score']['total_score']:.4f}")
            else:
                print("  No photographers match the filters")
        else:
            print(f"❌ Optimization failed: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")


def demo_booking_workflow(token, photographer):
    """Demonstrate MODULE 4: Booking Workflow"""
    if not photographer:
        print("\n⚠️ Skipping booking demo - no photographer selected")
        return
    
    print("\n" + "="*80)
    print("📅 MODULE 4: BOOKING WORKFLOW DEMO")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 1: Create booking
    print("\n📝 Step 1: Create Booking (Status: REQUESTED)")
    print("-" * 60)
    
    booking_request = {
        "photographer_id": photographer['photographer_id'],
        "event_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
        "event_time": "10:00 AM",
        "location": "Lahore, Pakistan",
        "event_type": "Wedding",
        "notes": "Outdoor wedding ceremony",
        "price": photographer['price'],
        "optimization_score": photographer['optimization_score']
    }
    
    print(f"Creating booking with:")
    print(f"  • Photographer: {photographer['name']}")
    print(f"  • Price: PKR {photographer['price']:,.0f}")
    print(f"  • Date: {booking_request['event_date']}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/bookings",
            json=booking_request,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            booking = result['data'][0] if isinstance(result['data'], list) else result['data']
            booking_id = booking['id']
            
            print(f"✅ Booking created!")
            print(f"  • Booking ID: {booking_id}")
            print(f"  • Status: {booking['status'].upper()}")
            
            # Step 2: Test double booking prevention
            print("\n🔒 Step 2: Test Double Booking Prevention")
            print("-" * 60)
            
            response2 = requests.post(
                f"{BASE_URL}/bookings",
                json=booking_request,
                headers=headers
            )
            
            if response2.status_code == 409:
                print("✅ Double booking prevented successfully!")
            else:
                print(f"⚠️ Unexpected response: {response2.status_code}")
            
            # Step 3: Status transitions
            print("\n🔄 Step 3: Status Workflow Transitions")
            print("-" * 60)
            
            statuses = [
                ("accepted", "Photographer accepts"),
                ("paid", "Client pays"),
                ("completed", "Event completed")
            ]
            
            for new_status, description in statuses:
                print(f"\n  Transitioning to: {new_status.upper()} ({description})")
                
                response = requests.put(
                    f"{BASE_URL}/bookings/{booking_id}/status",
                    json={"status": new_status},
                    headers=headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"  ✅ {result['message']}")
                    if 'workflow' in result:
                        workflow = result['workflow']
                        print(f"  Next allowed: {workflow['next_allowed_transitions']}")
                else:
                    print(f"  ❌ Transition failed: {response.text}")
                    break
            
            print("\n✅ Booking workflow demo completed!")
            
        else:
            print(f"❌ Booking creation failed: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")


def demo_explain_optimization(token):
    """Demonstrate optimization explanation (for viva)"""
    print("\n" + "="*80)
    print("📖 OPTIMIZATION EXPLANATION (VIVA DEMONSTRATION)")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    optimization_request = {
        "client_city": "Lahore",
        "event_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
        "max_budget": 50000,
        "top_k": 2
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/bookings/optimize/explain",
            json=optimization_request,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print("\n" + result['explanation'])
        else:
            print(f"❌ Failed: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")


def main():
    """Run all demos"""
    
    # Login
    token = login(CLIENT_EMAIL, CLIENT_PASSWORD)
    if not token:
        print("\n⚠️ Cannot proceed without authentication")
        print("Please ensure:")
        print("  1. Backend server is running (python backend/main.py)")
        print("  2. Test user exists with credentials above")
        return
    
    # Update normalization cache
    print("\n🔄 Updating normalization cache...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{BASE_URL}/bookings/update-normalization-cache", headers=headers)
        if response.status_code == 200:
            print("✅ Cache updated")
    except:
        print("⚠️ Cache update skipped")
    
    # Run demos
    best_photographer = demo_optimization(token)
    demo_optimization_with_filters(token)
    demo_booking_workflow(token, best_photographer)
    demo_explain_optimization(token)
    
    print("\n" + "="*80)
    print("✅ ALL DEMOS COMPLETED!")
    print("="*80)
    print("\n📚 Key Features Demonstrated:")
    print("  ✓ MODULE 2: Photographer data normalization (0-1 scale)")
    print("  ✓ MODULE 3: ILP optimization with PuLP")
    print("  ✓ MODULE 3: Score breakdown for explainability")
    print("  ✓ MODULE 3: Constraint handling (budget, gender, specialty)")
    print("  ✓ MODULE 4: Booking creation from optimization")
    print("  ✓ MODULE 4: Double booking prevention")
    print("  ✓ MODULE 4: Status workflow (REQUESTED → ACCEPTED → PAID → COMPLETED)")
    print("\n🎓 Ready for VIVA presentation!")
    print()


if __name__ == "__main__":
    main()
