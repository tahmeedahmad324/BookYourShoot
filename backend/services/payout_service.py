"""
Payout Service - Manages photographer payouts
Handles bank transfers, JazzCash, and EasyPaisa payouts
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from enum import Enum
import uuid


class PayoutStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    REJECTED = "rejected"
    FAILED = "failed"


class PayoutMethod(Enum):
    BANK = "bank"
    JAZZCASH = "jazzcash"
    EASYPAISA = "easypaisa"


# Pakistani Banks List
PAKISTANI_BANKS = [
    "Allied Bank Limited (ABL)",
    "Askari Bank",
    "Bank Alfalah",
    "Bank Al-Habib",
    "Faysal Bank",
    "Habib Bank Limited (HBL)",
    "Habib Metropolitan Bank",
    "JS Bank",
    "MCB Bank",
    "Meezan Bank",
    "National Bank of Pakistan (NBP)",
    "Silk Bank",
    "Soneri Bank",
    "Standard Chartered Pakistan",
    "Summit Bank",
    "The Bank of Punjab",
    "United Bank Limited (UBL)",
    "Other"
]


class PhotographerBalance:
    """Tracks photographer's earnings and balance"""
    
    def __init__(self, photographer_id: str):
        self.photographer_id = photographer_id
        self.total_earnings = 0.0  # Lifetime earnings
        self.available_balance = 0.0  # Ready for withdrawal
        self.pending_balance = 0.0  # In escrow, not yet released
        self.withdrawn_amount = 0.0  # Total amount withdrawn
        self.transactions = []  # List of all transactions
    
    def add_pending(self, amount: float, booking_id: str):
        """Add amount to pending balance (when client pays)"""
        self.pending_balance += amount
        self.transactions.append({
            "type": "pending",
            "amount": amount,
            "booking_id": booking_id,
            "timestamp": datetime.now().isoformat(),
            "description": f"Payment received for booking {booking_id} (in escrow)"
        })
    
    def release_to_available(self, amount: float, booking_id: str):
        """Move amount from pending to available (after escrow release)"""
        if self.pending_balance >= amount:
            self.pending_balance -= amount
            self.available_balance += amount
            self.total_earnings += amount
            self.transactions.append({
                "type": "released",
                "amount": amount,
                "booking_id": booking_id,
                "timestamp": datetime.now().isoformat(),
                "description": f"Payment released for booking {booking_id}"
            })
            return True
        return False
    
    def withdraw(self, amount: float, payout_id: str):
        """Withdraw from available balance"""
        if self.available_balance >= amount:
            self.available_balance -= amount
            self.withdrawn_amount += amount
            self.transactions.append({
                "type": "withdrawal",
                "amount": amount,
                "payout_id": payout_id,
                "timestamp": datetime.now().isoformat(),
                "description": f"Withdrawal processed - Payout {payout_id}"
            })
            return True
        return False
    
    def to_dict(self) -> Dict:
        return {
            "photographer_id": self.photographer_id,
            "total_earnings": self.total_earnings,
            "available_balance": self.available_balance,
            "pending_balance": self.pending_balance,
            "withdrawn_amount": self.withdrawn_amount,
            "recent_transactions": self.transactions[-10:]  # Last 10 transactions
        }


class Payout:
    """Represents a payout request"""
    
    def __init__(self, photographer_id: str, amount: float, method: str,
                 bank_details: Dict = None, wallet_number: str = None):
        self.id = f"PAYOUT-{uuid.uuid4().hex[:8].upper()}"
        self.photographer_id = photographer_id
        self.amount = amount
        self.method = method  # bank, jazzcash, easypaisa
        self.bank_details = bank_details  # {bank_name, account_title, account_number}
        self.wallet_number = wallet_number
        self.status = PayoutStatus.PENDING
        self.created_at = datetime.now().isoformat()
        self.processed_at = None
        self.processed_by = None  # Admin who processed
        self.transaction_reference = None  # Bank reference number
        self.failure_reason = None
        self.payment_ids = []  # Source payment IDs
        self.booking_ids = []  # Source booking IDs
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "photographer_id": self.photographer_id,
            "amount": self.amount,
            "method": self.method,
            "bank_details": self.bank_details,
            "wallet_number": self.wallet_number,
            "status": self.status.value,
            "created_at": self.created_at,
            "processed_at": self.processed_at,
            "processed_by": self.processed_by,
            "transaction_reference": self.transaction_reference,
            "failure_reason": self.failure_reason,
            "payment_ids": self.payment_ids,
            "booking_ids": self.booking_ids
        }


class PayoutService:
    """
    Manages all payout operations
    In production, this would integrate with:
    - Bank APIs (1Link, Raast) for bank transfers
    - JazzCash Business API for wallet transfers
    - EasyPaisa Business API for wallet transfers
    """
    
    # Minimum payout amount (PKR)
    MIN_PAYOUT_AMOUNT = 1000
    
    def __init__(self):
        # In-memory storage (use database in production)
        self.balances: Dict[str, PhotographerBalance] = {}
        self.payouts: Dict[str, Payout] = {}
        self.bank_details: Dict[str, Dict] = {}  # photographer_id -> bank details
        print("💰 Payout Service initialized")
    
    def get_or_create_balance(self, photographer_id: str) -> PhotographerBalance:
        """Get or create a balance tracker for photographer"""
        if photographer_id not in self.balances:
            self.balances[photographer_id] = PhotographerBalance(photographer_id)
        return self.balances[photographer_id]
    
    def save_bank_details(self, photographer_id: str, details: Dict) -> Dict:
        """
        Save photographer's bank/wallet details
        Details should include:
        - preferred_method: 'bank', 'jazzcash', or 'easypaisa'
        - bank_name, account_title, account_number (for bank)
        - wallet_number (for mobile wallets)
        """
        self.bank_details[photographer_id] = {
            **details,
            "verified": False,
            "updated_at": datetime.now().isoformat()
        }
        return {
            "status": "success",
            "message": "Bank details saved successfully",
            "details": self.bank_details[photographer_id]
        }
    
    def get_bank_details(self, photographer_id: str) -> Optional[Dict]:
        """Get photographer's saved bank details"""
        return self.bank_details.get(photographer_id)
    
    def verify_bank_details(self, photographer_id: str, admin_id: str) -> Dict:
        """Admin verifies photographer's bank details"""
        if photographer_id not in self.bank_details:
            return {"status": "error", "message": "No bank details found"}
        
        self.bank_details[photographer_id]["verified"] = True
        self.bank_details[photographer_id]["verified_by"] = admin_id
        self.bank_details[photographer_id]["verified_at"] = datetime.now().isoformat()
        
        return {
            "status": "success",
            "message": "Bank details verified successfully"
        }
    
    def add_earnings(self, photographer_id: str, amount: float, booking_id: str, 
                    is_released: bool = False) -> Dict:
        """
        Add earnings for a photographer
        If is_released=True, add directly to available balance
        Otherwise, add to pending (escrow)
        """
        balance = self.get_or_create_balance(photographer_id)
        
        if is_released:
            balance.release_to_available(amount, booking_id)
            message = f"PKR {amount:,.0f} added to available balance"
        else:
            balance.add_pending(amount, booking_id)
            message = f"PKR {amount:,.0f} added to pending balance (in escrow)"
        
        return {
            "status": "success",
            "message": message,
            "balance": balance.to_dict()
        }
    
    def release_earnings(self, photographer_id: str, amount: float, booking_id: str) -> Dict:
        """Release earnings from escrow to available balance"""
        balance = self.get_or_create_balance(photographer_id)
        
        if balance.release_to_available(amount, booking_id):
            return {
                "status": "success",
                "message": f"PKR {amount:,.0f} released to available balance",
                "balance": balance.to_dict()
            }
        return {
            "status": "error",
            "message": "Insufficient pending balance"
        }
    
    def get_balance(self, photographer_id: str) -> Dict:
        """Get photographer's current balance"""
        balance = self.get_or_create_balance(photographer_id)
        return balance.to_dict()
    
    def request_payout(self, photographer_id: str, amount: float = None) -> Dict:
        """
        Request a payout for photographer
        If amount is None, request all available balance
        """
        balance = self.get_or_create_balance(photographer_id)
        bank_details = self.get_bank_details(photographer_id)
        
        # Check if bank details exist
        if not bank_details:
            return {
                "status": "error",
                "message": "Please add your bank/wallet details first"
            }
        
        # Note: For FYP demo, we skip strict verification
        # In production, uncomment this block:
        # if not bank_details.get("verified"):
        #     return {
        #         "status": "error",
        #         "message": "Your bank details are pending verification. Please wait for admin approval."
        #     }
        
        # Determine amount
        payout_amount = amount or balance.available_balance
        
        # Check minimum amount
        if payout_amount < self.MIN_PAYOUT_AMOUNT:
            return {
                "status": "error",
                "message": f"Minimum payout amount is PKR {self.MIN_PAYOUT_AMOUNT:,}"
            }
        
        # Check available balance
        if payout_amount > balance.available_balance:
            return {
                "status": "error",
                "message": f"Insufficient balance. Available: PKR {balance.available_balance:,.0f}"
            }
        
        # Create payout request
        method = bank_details.get("preferred_method", "bank")
        
        payout = Payout(
            photographer_id=photographer_id,
            amount=payout_amount,
            method=method,
            bank_details={
                "bank_name": bank_details.get("bank_name"),
                "account_title": bank_details.get("account_title"),
                "account_number": bank_details.get("account_number")
            } if method == "bank" else None,
            wallet_number=bank_details.get("wallet_number") if method != "bank" else None
        )
        
        self.payouts[payout.id] = payout
        
        return {
            "status": "success",
            "message": f"Payout request submitted for PKR {payout_amount:,.0f}",
            "payout": payout.to_dict()
        }
    
    def process_payout(self, payout_id: str, admin_id: str, 
                      transaction_reference: str = None) -> Dict:
        """
        Admin processes a payout request
        In production, this would trigger actual bank transfer
        """
        if payout_id not in self.payouts:
            return {"status": "error", "message": "Payout not found"}
        
        payout = self.payouts[payout_id]
        
        if payout.status != PayoutStatus.PENDING:
            return {"status": "error", "message": f"Payout already {payout.status.value}"}
        
        # Get photographer balance
        balance = self.get_or_create_balance(payout.photographer_id)
        
        # Deduct from available balance
        if not balance.withdraw(payout.amount, payout_id):
            payout.status = PayoutStatus.FAILED
            payout.failure_reason = "Insufficient balance"
            return {"status": "error", "message": "Insufficient balance"}
        
        # Mark as completed
        payout.status = PayoutStatus.COMPLETED
        payout.processed_at = datetime.now().isoformat()
        payout.processed_by = admin_id
        payout.transaction_reference = transaction_reference or f"TXN-{uuid.uuid4().hex[:8].upper()}"
        
        return {
            "status": "success",
            "message": f"Payout of PKR {payout.amount:,.0f} processed successfully",
            "payout": payout.to_dict(),
            "balance": balance.to_dict()
        }
    
    def reject_payout(self, payout_id: str, admin_id: str, reason: str) -> Dict:
        """Admin rejects a payout request"""
        if payout_id not in self.payouts:
            return {"status": "error", "message": "Payout not found"}
        
        payout = self.payouts[payout_id]
        
        if payout.status != PayoutStatus.PENDING:
            return {"status": "error", "message": f"Payout already {payout.status.value}"}
        
        payout.status = PayoutStatus.REJECTED
        payout.failure_reason = reason
        payout.processed_at = datetime.now().isoformat()
        payout.processed_by = admin_id
        
        return {
            "status": "success",
            "message": "Payout request rejected",
            "payout": payout.to_dict()
        }
    
    def get_payout(self, payout_id: str) -> Optional[Dict]:
        """Get payout details"""
        if payout_id in self.payouts:
            return self.payouts[payout_id].to_dict()
        return None
    
    def get_photographer_payouts(self, photographer_id: str) -> List[Dict]:
        """Get all payouts for a photographer"""
        return [
            p.to_dict() for p in self.payouts.values()
            if p.photographer_id == photographer_id
        ]
    
    def get_pending_payouts(self) -> List[Dict]:
        """Get all pending payouts (admin view)"""
        return [
            p.to_dict() for p in self.payouts.values()
            if p.status == PayoutStatus.PENDING
        ]
    
    def get_all_payouts(self, status: str = None) -> List[Dict]:
        """Get all payouts with optional status filter"""
        payouts = list(self.payouts.values())
        
        if status:
            payouts = [p for p in payouts if p.status.value == status]
        
        return [p.to_dict() for p in payouts]
    
    def get_payout_stats(self) -> Dict:
        """Get payout statistics for admin dashboard"""
        all_payouts = list(self.payouts.values())
        
        pending = [p for p in all_payouts if p.status == PayoutStatus.PENDING]
        completed = [p for p in all_payouts if p.status == PayoutStatus.COMPLETED]
        failed = [p for p in all_payouts if p.status == PayoutStatus.FAILED]
        
        return {
            "pending_count": len(pending),
            "pending_amount": sum(p.amount for p in pending),
            "completed_count": len(completed),
            "completed_amount": sum(p.amount for p in completed),
            "failed_count": len(failed),
            "total_photographers": len(self.balances),
            "total_available_balance": sum(b.available_balance for b in self.balances.values()),
            "total_pending_balance": sum(b.pending_balance for b in self.balances.values())
        }


# Initialize payout service
payout_service = PayoutService()
