"""
Escrow Service - Manages payment holds and releases
Holds payments until work is completed or handles refunds on cancellation

Flow:
1. Client pays → Money held in escrow (platform holds it)
2. Work completed → Client confirms → Release to photographer
3. Booking cancelled → Refund to client based on cancellation policy
"""

from datetime import datetime, timedelta
from typing import Dict, Optional, List
from enum import Enum

# Import payout service for integration
try:
    from backend.services.payout_service import payout_service
except ImportError:
    payout_service = None


class EscrowStatus(Enum):
    HELD = "held"  # Payment received, held by platform
    RELEASED = "released"  # Released to photographer
    REFUNDED = "refunded"  # Refunded to client
    PARTIALLY_REFUNDED = "partially_refunded"  # Partial refund (e.g., cancellation fee deducted)


class CancellationPolicy:
    """
    Cancellation policy rules
    More than X days before: Full refund
    Less than X days: Partial refund with photographer compensation
    """
    
    @staticmethod
    def calculate_refund(booking_date: str, cancellation_date: str, total_amount: float) -> Dict:
        """
        Calculate refund amount based on cancellation policy
        
        Policy:
        - 14+ days before: 100% refund (photographer gets nothing)
        - 7-13 days before: 50% refund (photographer gets 50%)
        - 3-6 days before: 25% refund (photographer gets 75%)
        - Less than 3 days: No refund (photographer gets 100%)
        """
        booking = datetime.fromisoformat(booking_date)
        cancelled = datetime.fromisoformat(cancellation_date)
        days_until_booking = (booking - cancelled).days
        
        if days_until_booking >= 14:
            return {
                "client_refund": total_amount,
                "photographer_payment": 0,
                "platform_fee": 0,
                "policy": "Full refund - 14+ days notice"
            }
        elif days_until_booking >= 7:
            return {
                "client_refund": total_amount * 0.5,
                "photographer_payment": total_amount * 0.5,
                "platform_fee": 0,
                "policy": "50% refund - 7-13 days notice"
            }
        elif days_until_booking >= 3:
            return {
                "client_refund": total_amount * 0.25,
                "photographer_payment": total_amount * 0.75,
                "platform_fee": 0,
                "policy": "25% refund - 3-6 days notice"
            }
        else:
            return {
                "client_refund": 0,
                "photographer_payment": total_amount,
                "platform_fee": 0,
                "policy": "No refund - Less than 3 days notice"
            }


class EscrowTransaction:
    """Represents a single escrow transaction"""
    
    def __init__(self, transaction_id: str, booking_id: str, amount: float, 
                 client_id: str, photographer_id: str, transaction_type: str = "booking"):
        self.transaction_id = transaction_id
        self.booking_id = booking_id
        self.amount = amount
        self.client_id = client_id
        self.photographer_id = photographer_id
        self.transaction_type = transaction_type  # "booking" or "equipment_rental"
        self.status = EscrowStatus.HELD
        self.created_at = datetime.now().isoformat()
        self.released_at = None
        self.refunded_at = None
        self.notes = []
        self.platform_fee = amount * 0.1  # 10% platform commission
        self.photographer_amount = amount * 0.9  # 90% goes to photographer
        self.deposit_amount = 0  # For equipment rentals
        
    def to_dict(self) -> Dict:
        return {
            "transaction_id": self.transaction_id,
            "booking_id": self.booking_id,
            "amount": self.amount,
            "client_id": self.client_id,
            "photographer_id": self.photographer_id,
            "transaction_type": self.transaction_type,
            "status": self.status.value,
            "created_at": self.created_at,
            "released_at": self.released_at,
            "refunded_at": self.refunded_at,
            "platform_fee": self.platform_fee,
            "photographer_amount": self.photographer_amount,
            "deposit_amount": self.deposit_amount,
            "notes": self.notes
        }


class EscrowService:
    """
    Manages all escrow transactions
    In production, this would interface with a database and actual payment processor
    """
    
    def __init__(self):
        # In-memory storage for demo (use database in production)
        self.transactions: Dict[str, EscrowTransaction] = {}
    
    def create_escrow(self, transaction_id: str, booking_id: str, amount: float,
                     client_id: str, photographer_id: str, transaction_type: str = "booking",
                     deposit_amount: float = 0) -> EscrowTransaction:
        """
        Create a new escrow transaction
        Money is received from client and held by platform
        """
        escrow = EscrowTransaction(
            transaction_id=transaction_id,
            booking_id=booking_id,
            amount=amount,
            client_id=client_id,
            photographer_id=photographer_id,
            transaction_type=transaction_type
        )
        escrow.deposit_amount = deposit_amount
        escrow.notes.append(f"{datetime.now().isoformat()}: Escrow created - Rs. {amount} held")
        
        self.transactions[transaction_id] = escrow
        
        # Add to photographer's pending balance (in escrow)
        if payout_service:
            payout_service.add_earnings(
                photographer_id=photographer_id,
                amount=escrow.photographer_amount,  # 90% after platform fee
                booking_id=booking_id,
                is_released=False  # In escrow, not yet available
            )
        
        return escrow
    
    def release_to_photographer(self, transaction_id: str, reason: str = "Work completed") -> Dict:
        """
        Release payment to photographer
        Called when client confirms work completion or automatically after X days
        """
        if transaction_id not in self.transactions:
            return {"error": "Transaction not found", "status": "failed"}
        
        escrow = self.transactions[transaction_id]
        
        if escrow.status != EscrowStatus.HELD:
            return {"error": f"Cannot release - current status: {escrow.status.value}", "status": "failed"}
        
        # Release payment
        escrow.status = EscrowStatus.RELEASED
        escrow.released_at = datetime.now().isoformat()
        escrow.notes.append(f"{datetime.now().isoformat()}: Released Rs. {escrow.photographer_amount} to photographer - {reason}")
        escrow.notes.append(f"{datetime.now().isoformat()}: Platform fee Rs. {escrow.platform_fee} retained")
        
        # Release earnings to photographer's available balance
        if payout_service:
            payout_service.release_earnings(
                photographer_id=escrow.photographer_id,
                amount=escrow.photographer_amount,
                booking_id=escrow.booking_id
            )
        
        # In production: Call Stripe Transfer API to send money to photographer's connected account
        # stripe.Transfer.create(
        #     amount=int(escrow.photographer_amount * 100),
        #     currency="pkr",
        #     destination=photographer_stripe_account_id,
        # )
        
        return {
            "status": "success",
            "transaction_id": transaction_id,
            "amount_released": escrow.photographer_amount,
            "platform_fee": escrow.platform_fee,
            "photographer_id": escrow.photographer_id,
            "released_at": escrow.released_at,
            "message": f"Rs. {escrow.photographer_amount} released to photographer"
        }
    
    def refund_to_client(self, transaction_id: str, booking_date: str, 
                        reason: str = "Booking cancelled") -> Dict:
        """
        Refund payment to client based on cancellation policy
        """
        if transaction_id not in self.transactions:
            return {"error": "Transaction not found", "status": "failed"}
        
        escrow = self.transactions[transaction_id]
        
        if escrow.status != EscrowStatus.HELD:
            return {"error": f"Cannot refund - current status: {escrow.status.value}", "status": "failed"}
        
        # Calculate refund based on cancellation policy
        cancellation = CancellationPolicy.calculate_refund(
            booking_date=booking_date,
            cancellation_date=datetime.now().isoformat(),
            total_amount=escrow.amount
        )
        
        client_refund = cancellation["client_refund"]
        photographer_payment = cancellation["photographer_payment"]
        
        # Update escrow status
        if client_refund == escrow.amount:
            escrow.status = EscrowStatus.REFUNDED
        else:
            escrow.status = EscrowStatus.PARTIALLY_REFUNDED
        
        escrow.refunded_at = datetime.now().isoformat()
        escrow.notes.append(f"{datetime.now().isoformat()}: {cancellation['policy']}")
        escrow.notes.append(f"{datetime.now().isoformat()}: Refund Rs. {client_refund} to client")
        if photographer_payment > 0:
            escrow.notes.append(f"{datetime.now().isoformat()}: Payment Rs. {photographer_payment} to photographer (cancellation fee)")
        
        # In production: Process actual refund and transfer
        # stripe.Refund.create(payment_intent=payment_intent_id, amount=int(client_refund * 100))
        # if photographer_payment > 0:
        #     stripe.Transfer.create(amount=int(photographer_payment * 100), destination=photographer_account)
        
        return {
            "status": "success",
            "transaction_id": transaction_id,
            "refund_amount": client_refund,
            "photographer_payment": photographer_payment,
            "policy": cancellation["policy"],
            "refunded_at": escrow.refunded_at,
            "message": f"Rs. {client_refund} refunded to client. Rs. {photographer_payment} to photographer."
        }
    
    def release_deposit(self, transaction_id: str, deduction: float = 0, 
                       reason: str = "Equipment returned") -> Dict:
        """
        Release equipment rental deposit back to client
        Deduct amount if equipment damaged
        """
        if transaction_id not in self.transactions:
            return {"error": "Transaction not found", "status": "failed"}
        
        escrow = self.transactions[transaction_id]
        
        if escrow.transaction_type != "equipment_rental":
            return {"error": "Not an equipment rental transaction", "status": "failed"}
        
        refund_amount = escrow.deposit_amount - deduction
        
        escrow.notes.append(f"{datetime.now().isoformat()}: Deposit release - Rs. {refund_amount} to client, Rs. {deduction} deducted - {reason}")
        
        return {
            "status": "success",
            "transaction_id": transaction_id,
            "deposit_refund": refund_amount,
            "deduction": deduction,
            "reason": reason,
            "message": f"Deposit Rs. {refund_amount} released to client"
        }
    
    def get_transaction(self, transaction_id: str) -> Optional[Dict]:
        """Get transaction details"""
        if transaction_id in self.transactions:
            return self.transactions[transaction_id].to_dict()
        return None
    
    def get_photographer_earnings(self, photographer_id: str) -> Dict:
        """Get photographer's earnings summary"""
        earnings = {
            "total_held": 0,
            "total_released": 0,
            "total_pending": 0,
            "transactions": []
        }
        
        for escrow in self.transactions.values():
            if escrow.photographer_id == photographer_id:
                if escrow.status == EscrowStatus.HELD:
                    earnings["total_held"] += escrow.photographer_amount
                    earnings["total_pending"] += 1
                elif escrow.status == EscrowStatus.RELEASED:
                    earnings["total_released"] += escrow.photographer_amount
                
                earnings["transactions"].append(escrow.to_dict())
        
        return earnings
    
    def get_transaction_by_booking(self, booking_id: str) -> Optional[Dict]:
        """Get escrow transaction by booking ID"""
        for escrow in self.transactions.values():
            if escrow.booking_id == booking_id:
                return escrow.to_dict()
        return None
    
    def get_all_transactions(self) -> List[Dict]:
        """Get all transactions (for admin)"""
        return [escrow.to_dict() for escrow in self.transactions.values()]
    
    def auto_release_payments(self) -> List[Dict]:
        """
        Auto-release payments after X days of booking completion
        Run this as a scheduled job (e.g., daily)
        """
        released = []
        auto_release_days = 7  # Auto-release after 7 days
        
        for escrow in self.transactions.values():
            if escrow.status == EscrowStatus.HELD:
                created = datetime.fromisoformat(escrow.created_at)
                days_held = (datetime.now() - created).days
                
                if days_held >= auto_release_days:
                    result = self.release_to_photographer(
                        escrow.transaction_id,
                        reason=f"Auto-release after {auto_release_days} days"
                    )
                    released.append(result)
        
        return released


# Initialize escrow service
escrow_service = EscrowService()
