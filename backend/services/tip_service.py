"""
Tip Service - Allows clients to tip photographers after completed sessions
Tips are 100% for photographers (no platform cut)
"""

from datetime import datetime
from typing import Dict, List, Optional
import uuid


class TipService:
    """
    Manages tips from clients to photographers
    - Tips are optional and given after completed bookings
    - 100% of tip goes to photographer (no platform fee)
    - Supports preset amounts and custom amounts
    """
    
    # Preset tip amounts in PKR
    PRESET_TIPS = [500, 1000, 2000, 5000]
    
    # Tip percentage suggestions based on booking amount
    PERCENTAGE_SUGGESTIONS = [5, 10, 15, 20]
    
    def __init__(self):
        self._tips: Dict[str, Dict] = {}  # tip_id -> tip data
        self._tips_by_booking: Dict[str, str] = {}  # booking_id -> tip_id
        self._tips_by_photographer: Dict[str, List[str]] = {}  # photographer_id -> [tip_ids]
        self._photographer_totals: Dict[str, float] = {}  # photographer_id -> total tips
        print("💝 Tip Service initialized")
    
    def get_tip_suggestions(self, booking_amount: float) -> Dict:
        """
        Get tip suggestions based on booking amount
        Returns preset amounts and percentage-based suggestions
        """
        percentage_tips = [
            {
                "percentage": pct,
                "amount": round(booking_amount * pct / 100),
                "label": f"{pct}%"
            }
            for pct in self.PERCENTAGE_SUGGESTIONS
        ]
        
        return {
            "preset_amounts": self.PRESET_TIPS,
            "percentage_tips": percentage_tips,
            "min_amount": 100,
            "max_amount": 50000,
            "currency": "PKR"
        }
    
    def send_tip(
        self,
        booking_id: str,
        client_id: str,
        client_name: str,
        photographer_id: str,
        photographer_name: str,
        amount: float,
        message: Optional[str] = None,
        payment_method: str = "card"
    ) -> Dict:
        """
        Send a tip to photographer
        Tips are processed immediately and 100% goes to photographer
        """
        # Validate amount
        if amount < 100:
            return {
                "status": "error",
                "message": "Minimum tip amount is PKR 100"
            }
        
        if amount > 50000:
            return {
                "status": "error",
                "message": "Maximum tip amount is PKR 50,000"
            }
        
        # Check if tip already sent for this booking
        if booking_id in self._tips_by_booking:
            existing_tip_id = self._tips_by_booking[booking_id]
            existing_tip = self._tips.get(existing_tip_id)
            return {
                "status": "error",
                "message": "Tip already sent for this booking",
                "existing_tip": existing_tip
            }
        
        # Create tip record
        tip_id = f"tip_{uuid.uuid4().hex[:12]}"
        tip = {
            "id": tip_id,
            "booking_id": booking_id,
            "client_id": client_id,
            "client_name": client_name,
            "photographer_id": photographer_id,
            "photographer_name": photographer_name,
            "amount": amount,
            "message": message,
            "payment_method": payment_method,
            "platform_fee": 0,  # No platform cut on tips!
            "photographer_receives": amount,  # 100% to photographer
            "status": "completed",
            "created_at": datetime.now().isoformat()
        }
        
        # Store tip
        self._tips[tip_id] = tip
        self._tips_by_booking[booking_id] = tip_id
        
        # Update photographer's tips list
        if photographer_id not in self._tips_by_photographer:
            self._tips_by_photographer[photographer_id] = []
        self._tips_by_photographer[photographer_id].append(tip_id)
        
        # Update photographer's total
        if photographer_id not in self._photographer_totals:
            self._photographer_totals[photographer_id] = 0
        self._photographer_totals[photographer_id] += amount
        
        print(f"💝 Tip sent: PKR {amount:,.0f} from {client_name} to {photographer_name}")
        print(f"   📝 Message: {message or '(No message)'}")
        
        return {
            "status": "success",
            "message": "Tip sent successfully! The photographer has been notified.",
            "tip": tip
        }
    
    def get_tip_by_booking(self, booking_id: str) -> Optional[Dict]:
        """Get tip for a specific booking"""
        tip_id = self._tips_by_booking.get(booking_id)
        if tip_id:
            return self._tips.get(tip_id)
        return None
    
    def get_tip_by_id(self, tip_id: str) -> Optional[Dict]:
        """Get tip by ID"""
        return self._tips.get(tip_id)
    
    def get_photographer_tips(self, photographer_id: str) -> List[Dict]:
        """Get all tips received by a photographer"""
        tip_ids = self._tips_by_photographer.get(photographer_id, [])
        return [self._tips[tid] for tid in tip_ids if tid in self._tips]
    
    def get_photographer_tip_stats(self, photographer_id: str) -> Dict:
        """Get tip statistics for a photographer"""
        tips = self.get_photographer_tips(photographer_id)
        
        if not tips:
            return {
                "total_tips": 0,
                "tip_count": 0,
                "average_tip": 0,
                "highest_tip": 0,
                "recent_tips": []
            }
        
        amounts = [t["amount"] for t in tips]
        
        return {
            "total_tips": sum(amounts),
            "tip_count": len(tips),
            "average_tip": round(sum(amounts) / len(tips)),
            "highest_tip": max(amounts),
            "recent_tips": sorted(tips, key=lambda x: x["created_at"], reverse=True)[:5]
        }
    
    def get_client_tips(self, client_id: str) -> List[Dict]:
        """Get all tips sent by a client"""
        return [t for t in self._tips.values() if t["client_id"] == client_id]
    
    def get_all_tips(self) -> List[Dict]:
        """Get all tips (admin view)"""
        return list(self._tips.values())
    
    def get_tip_leaderboard(self, limit: int = 10) -> List[Dict]:
        """Get photographers with most tips (for admin/analytics)"""
        leaderboard = []
        
        for photographer_id, tip_ids in self._tips_by_photographer.items():
            tips = [self._tips[tid] for tid in tip_ids if tid in self._tips]
            if tips:
                total = sum(t["amount"] for t in tips)
                leaderboard.append({
                    "photographer_id": photographer_id,
                    "photographer_name": tips[0]["photographer_name"],
                    "total_tips": total,
                    "tip_count": len(tips),
                    "average_tip": round(total / len(tips))
                })
        
        # Sort by total tips descending
        leaderboard.sort(key=lambda x: x["total_tips"], reverse=True)
        return leaderboard[:limit]


# Global instance
tip_service = TipService()
