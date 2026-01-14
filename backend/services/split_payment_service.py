"""
Split Payment Service - Allow clients to pay in installments
Supports 2-4 installments for larger bookings
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
import uuid


class SplitPaymentService:
    """
    Manages split/installment payments
    - Pay 50% now, 50% before shoot
    - 3 or 4 installment plans for large bookings
    - Track payment schedules
    - Send reminders for upcoming installments
    """
    
    # Minimum amount for split payment eligibility
    MIN_SPLIT_AMOUNT = 10000  # Rs. 10,000
    
    # Available split options (only 3 installments - standard 50/50 is handled separately)
    SPLIT_OPTIONS = {
        "3_parts": {
            "name": "3 Installments",
            "description": "34% now, 33% midway, 33% before event",
            "installments": 3,
            "percentages": [34, 33, 33],
            "min_amount": 25000,
            "schedule_days": [0, -7, -1]  # now, 7 days before, 1 day before
        }
    }
    
    def __init__(self):
        self._payment_plans: Dict[str, Dict] = {}  # plan_id -> plan details
        self._booking_plans: Dict[str, str] = {}  # booking_id -> plan_id
        print("💳 Split Payment Service initialized")
    
    def get_available_options(self, amount: float) -> List[Dict]:
        """Get available split payment options for a given amount"""
        if amount < self.MIN_SPLIT_AMOUNT:
            return []
        
        available = []
        for key, option in self.SPLIT_OPTIONS.items():
            if amount >= option["min_amount"]:
                # Calculate actual amounts
                installments = []
                remaining = amount
                for i, pct in enumerate(option["percentages"]):
                    if i == len(option["percentages"]) - 1:
                        # Last installment gets the remainder
                        inst_amount = remaining
                    else:
                        inst_amount = round(amount * pct / 100)
                        remaining -= inst_amount
                    
                    installments.append({
                        "number": i + 1,
                        "percentage": pct,
                        "amount": inst_amount,
                        "schedule_day": option["schedule_days"][i]
                    })
                
                available.append({
                    "key": key,
                    "name": option["name"],
                    "description": option["description"],
                    "total_amount": amount,
                    "installments": installments,
                    "first_payment": installments[0]["amount"]
                })
        
        return available
    
    def create_payment_plan(
        self,
        booking_id: str,
        client_id: str,
        photographer_id: str,
        total_amount: float,
        shoot_date: str,
        split_option: str  # "2_parts", "3_parts", "4_parts"
    ) -> Dict:
        """Create a split payment plan for a booking"""
        
        if split_option not in self.SPLIT_OPTIONS:
            return {
                "status": "error",
                "message": "Invalid split option"
            }
        
        option = self.SPLIT_OPTIONS[split_option]
        
        if total_amount < option["min_amount"]:
            return {
                "status": "error",
                "message": f"Minimum amount for {option['name']} is Rs. {option['min_amount']:,}"
            }
        
        if booking_id in self._booking_plans:
            return {
                "status": "error",
                "message": "A payment plan already exists for this booking"
            }
        
        # Parse shoot date
        shoot = datetime.fromisoformat(shoot_date.replace('Z', '+00:00')) if 'T' in shoot_date else datetime.strptime(shoot_date, '%Y-%m-%d')
        
        # Create installment schedule
        installments = []
        remaining = total_amount
        
        for i, pct in enumerate(option["percentages"]):
            if i == len(option["percentages"]) - 1:
                inst_amount = remaining
            else:
                inst_amount = round(total_amount * pct / 100)
                remaining -= inst_amount
            
            # Calculate due date
            days_offset = option["schedule_days"][i]
            if days_offset == 0:
                due_date = datetime.now()
            else:
                due_date = shoot + timedelta(days=days_offset)
            
            installments.append({
                "number": i + 1,
                "amount": inst_amount,
                "percentage": pct,
                "due_date": due_date.isoformat(),
                "status": "pending" if i > 0 else "due",  # First one is due now
                "paid_at": None,
                "transaction_id": None
            })
        
        plan_id = f"plan_{uuid.uuid4().hex[:12]}"
        
        plan = {
            "id": plan_id,
            "booking_id": booking_id,
            "client_id": client_id,
            "photographer_id": photographer_id,
            "total_amount": total_amount,
            "paid_amount": 0,
            "remaining_amount": total_amount,
            "split_option": split_option,
            "option_name": option["name"],
            "shoot_date": shoot_date,
            "installments": installments,
            "status": "active",
            "created_at": datetime.now().isoformat()
        }
        
        self._payment_plans[plan_id] = plan
        self._booking_plans[booking_id] = plan_id
        
        print(f"💳 Created {option['name']} plan for booking {booking_id}")
        print(f"   📅 Total: Rs. {total_amount:,} in {len(installments)} installments")
        
        return {
            "status": "success",
            "message": f"Payment plan created: {option['name']}",
            "plan": plan
        }
    
    def record_installment_payment(
        self,
        booking_id: str,
        installment_number: int,
        transaction_id: str
    ) -> Dict:
        """Record a payment for an installment"""
        
        if booking_id not in self._booking_plans:
            return {"status": "error", "message": "No payment plan found for this booking"}
        
        plan_id = self._booking_plans[booking_id]
        plan = self._payment_plans[plan_id]
        
        # Find the installment
        installment = None
        for inst in plan["installments"]:
            if inst["number"] == installment_number:
                installment = inst
                break
        
        if not installment:
            return {"status": "error", "message": "Invalid installment number"}
        
        if installment["status"] == "paid":
            return {"status": "error", "message": "This installment is already paid"}
        
        # Mark as paid
        installment["status"] = "paid"
        installment["paid_at"] = datetime.now().isoformat()
        installment["transaction_id"] = transaction_id
        
        # Update plan totals
        plan["paid_amount"] += installment["amount"]
        plan["remaining_amount"] -= installment["amount"]
        
        # Mark next installment as due
        for inst in plan["installments"]:
            if inst["status"] == "pending":
                inst["status"] = "due"
                break
        
        # Check if fully paid
        if plan["remaining_amount"] <= 0:
            plan["status"] = "completed"
            print(f"✅ Payment plan {plan_id} completed!")
        
        print(f"💳 Installment {installment_number} paid for booking {booking_id}")
        print(f"   💰 Paid: Rs. {plan['paid_amount']:,} / Rs. {plan['total_amount']:,}")
        
        return {
            "status": "success",
            "message": f"Installment {installment_number} paid successfully",
            "plan": plan,
            "is_complete": plan["status"] == "completed"
        }
    
    def get_payment_plan(self, booking_id: str) -> Optional[Dict]:
        """Get payment plan for a booking"""
        if booking_id in self._booking_plans:
            plan_id = self._booking_plans[booking_id]
            return self._payment_plans.get(plan_id)
        return None
    
    def get_due_installments(self, client_id: str = None) -> List[Dict]:
        """Get all due installments (optionally filtered by client)"""
        due = []
        
        for plan in self._payment_plans.values():
            if plan["status"] != "active":
                continue
            if client_id and plan["client_id"] != client_id:
                continue
            
            for inst in plan["installments"]:
                if inst["status"] == "due":
                    due.append({
                        "booking_id": plan["booking_id"],
                        "plan_id": plan["id"],
                        "installment_number": inst["number"],
                        "amount": inst["amount"],
                        "due_date": inst["due_date"],
                        "total_remaining": plan["remaining_amount"]
                    })
        
        return due
    
    def get_upcoming_installments(self, days_ahead: int = 7) -> List[Dict]:
        """Get installments coming due in the next X days (for reminders)"""
        upcoming = []
        now = datetime.now()
        cutoff = now + timedelta(days=days_ahead)
        
        for plan in self._payment_plans.values():
            if plan["status"] != "active":
                continue
            
            for inst in plan["installments"]:
                if inst["status"] not in ["pending", "due"]:
                    continue
                
                due_date = datetime.fromisoformat(inst["due_date"])
                if now <= due_date <= cutoff:
                    upcoming.append({
                        "booking_id": plan["booking_id"],
                        "client_id": plan["client_id"],
                        "installment_number": inst["number"],
                        "amount": inst["amount"],
                        "due_date": inst["due_date"],
                        "days_until_due": (due_date - now).days
                    })
        
        # Sort by due date
        upcoming.sort(key=lambda x: x["due_date"])
        return upcoming
    
    def get_client_plans(self, client_id: str) -> List[Dict]:
        """Get all payment plans for a client"""
        return [p for p in self._payment_plans.values() if p["client_id"] == client_id]
    
    def cancel_plan(self, booking_id: str) -> Dict:
        """Cancel a payment plan (e.g., when booking is cancelled)"""
        if booking_id not in self._booking_plans:
            return {"status": "error", "message": "No payment plan found"}
        
        plan_id = self._booking_plans[booking_id]
        plan = self._payment_plans[plan_id]
        plan["status"] = "cancelled"
        
        return {
            "status": "success",
            "message": "Payment plan cancelled",
            "paid_amount": plan["paid_amount"],
            "refund_eligible": plan["paid_amount"]
        }


# Global instance
split_payment_service = SplitPaymentService()
