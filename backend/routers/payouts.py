"""
Payout Router - API endpoints for photographer payouts
Handles bank details, payout requests, and admin processing
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from backend.services.payout_service import payout_service, PAKISTANI_BANKS
from backend.services.notification_service import notification_service
from backend.services.email_service import email_service
from backend.auth import get_current_user

router = APIRouter(prefix="/payouts", tags=["Payouts"])


# ==================== Request Models ====================

class BankDetailsRequest(BaseModel):
    preferred_method: str  # 'bank', 'jazzcash', 'easypaisa'
    bank_name: Optional[str] = None
    account_title: Optional[str] = None
    account_number: Optional[str] = None
    wallet_number: Optional[str] = None


class PayoutRequest(BaseModel):
    amount: Optional[float] = None  # If None, request all available balance


class ProcessPayoutRequest(BaseModel):
    transaction_reference: Optional[str] = None


class RejectPayoutRequest(BaseModel):
    reason: str


# ==================== Bank Details Endpoints ====================

@router.get("/banks")
async def get_pakistani_banks():
    """Get list of Pakistani banks for dropdown"""
    return {
        "status": "success",
        "banks": PAKISTANI_BANKS
    }


@router.post("/bank-details")
async def save_bank_details(
    details: BankDetailsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Save photographer's bank/wallet details"""
    user_id = current_user.get("id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Validate based on method
    if details.preferred_method == "bank":
        if not all([details.bank_name, details.account_title, details.account_number]):
            raise HTTPException(
                status_code=400, 
                detail="Bank name, account title, and account number are required"
            )
    else:
        if not details.wallet_number:
            raise HTTPException(
                status_code=400,
                detail=f"{details.preferred_method} wallet number is required"
            )
    
    result = payout_service.save_bank_details(user_id, details.dict())
    return result


@router.get("/bank-details")
async def get_bank_details(current_user: dict = Depends(get_current_user)):
    """Get photographer's saved bank/wallet details"""
    user_id = current_user.get("id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    details = payout_service.get_bank_details(user_id)
    
    if not details:
        return {
            "status": "success",
            "has_details": False,
            "details": None
        }
    
    # Mask sensitive info
    masked_details = {**details}
    if masked_details.get("account_number"):
        acc = masked_details["account_number"]
        masked_details["account_number_masked"] = f"****{acc[-4:]}" if len(acc) > 4 else "****"
    if masked_details.get("wallet_number"):
        wallet = masked_details["wallet_number"]
        masked_details["wallet_number_masked"] = f"****{wallet[-4:]}" if len(wallet) > 4 else "****"
    
    return {
        "status": "success",
        "has_details": True,
        "details": masked_details
    }


# ==================== Balance Endpoints ====================

@router.get("/balance")
async def get_balance(current_user: dict = Depends(get_current_user)):
    """Get photographer's current balance and earnings"""
    user_id = current_user.get("id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    balance = payout_service.get_balance(user_id)
    return {
        "status": "success",
        "balance": balance
    }


@router.get("/transactions")
async def get_transactions(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get photographer's transaction history"""
    user_id = current_user.get("id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    balance = payout_service.get_balance(user_id)
    transactions = balance.get("recent_transactions", [])
    
    return {
        "status": "success",
        "transactions": transactions[-limit:]
    }


# ==================== Payout Request Endpoints ====================

@router.post("/request")
async def request_payout(
    request: PayoutRequest,
    current_user: dict = Depends(get_current_user)
):
    """Request a payout (photographer)"""
    user_id = current_user.get("id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    result = payout_service.request_payout(user_id, request.amount)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
    
    # Send notification for payout request
    payout_data = result.get("payout", {})
    bank_details = payout_service.get_bank_details(user_id) or {}
    bank_name = bank_details.get("bank_name") or bank_details.get("preferred_method", "Account")
    
    notification_service.notify_payout_requested(
        photographer_id=user_id,
        payout_id=payout_data.get("id", ""),
        amount=payout_data.get("amount", request.amount or 0),
        bank_name=bank_name
    )
    
    return result


@router.get("/my-payouts")
async def get_my_payouts(current_user: dict = Depends(get_current_user)):
    """Get all payout requests for current photographer"""
    user_id = current_user.get("id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    payouts = payout_service.get_photographer_payouts(user_id)
    return {
        "status": "success",
        "payouts": payouts
    }


@router.get("/{payout_id}")
async def get_payout_details(
    payout_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get details of a specific payout"""
    payout = payout_service.get_payout(payout_id)
    
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    
    # Verify ownership or admin
    user_id = current_user.get("id") or current_user.get("sub")
    user_role = current_user.get("role", "client")
    
    if payout.get("photographer_id") != user_id and user_role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "status": "success",
        "payout": payout
    }


# ==================== Admin Endpoints ====================

@router.get("/admin/pending")
async def get_pending_payouts(current_user: dict = Depends(get_current_user)):
    """Get all pending payout requests (admin only)"""
    # In production, verify admin role
    user_role = current_user.get("role", "client")
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    payouts = payout_service.get_pending_payouts()
    return {
        "status": "success",
        "pending_count": len(payouts),
        "payouts": payouts
    }


@router.get("/admin/all")
async def get_all_payouts(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all payouts with optional status filter (admin only)"""
    user_role = current_user.get("role", "client")
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    payouts = payout_service.get_all_payouts(status)
    return {
        "status": "success",
        "count": len(payouts),
        "payouts": payouts
    }


@router.get("/admin/stats")
async def get_payout_stats(current_user: dict = Depends(get_current_user)):
    """Get payout statistics for admin dashboard"""
    user_role = current_user.get("role", "client")
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    stats = payout_service.get_payout_stats()
    return {
        "status": "success",
        "stats": stats
    }


@router.post("/admin/process/{payout_id}")
async def process_payout(
    payout_id: str,
    request: ProcessPayoutRequest,
    current_user: dict = Depends(get_current_user)
):
    """Process/approve a payout request (admin only)"""
    user_role = current_user.get("role", "client")
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    admin_id = current_user.get("id") or current_user.get("sub")
    
    # Get payout details before processing
    payout = payout_service.get_payout(payout_id)
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    
    result = payout_service.process_payout(
        payout_id=payout_id,
        admin_id=admin_id,
        transaction_reference=request.transaction_reference
    )
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
    
    # Send notifications and email for processed payout
    photographer_id = payout.get("photographer_id")
    amount = payout.get("amount", 0)
    bank_details = payout_service.get_bank_details(photographer_id) or {}
    bank_name = bank_details.get("bank_name") or bank_details.get("preferred_method", "Account")
    account_number = bank_details.get("account_number") or bank_details.get("wallet_number", "")
    account_last4 = account_number[-4:] if len(account_number) >= 4 else "****"
    
    # Notification
    notification_service.notify_payout_processed(
        photographer_id=photographer_id,
        payout_id=payout_id,
        amount=amount,
        bank_name=bank_name
    )
    
    # Email (if we have email)
    photographer_email = payout.get("photographer_email")
    photographer_name = payout.get("photographer_name", "Photographer")
    if photographer_email:
        try:
            email_service.send_payout_processed(
                photographer_email=photographer_email,
                photographer_name=photographer_name,
                payout_id=payout_id,
                amount=amount,
                bank_name=bank_name,
                account_last4=account_last4
            )
        except Exception as e:
            print(f"Failed to send payout email: {e}")
    
    return result


@router.post("/admin/reject/{payout_id}")
async def reject_payout(
    payout_id: str,
    request: RejectPayoutRequest,
    current_user: dict = Depends(get_current_user)
):
    """Reject a payout request (admin only)"""
    user_role = current_user.get("role", "client")
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    admin_id = current_user.get("id") or current_user.get("sub")
    
    # Get payout details before rejecting
    payout = payout_service.get_payout(payout_id)
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    
    result = payout_service.reject_payout(
        payout_id=payout_id,
        admin_id=admin_id,
        reason=request.reason
    )
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
    
    # Send notification for rejected payout
    notification_service.notify_payout_rejected(
        photographer_id=payout.get("photographer_id"),
        payout_id=payout_id,
        amount=payout.get("amount", 0),
        reason=request.reason
    )
    
    return result


@router.post("/admin/verify-bank/{photographer_id}")
async def verify_bank_details(
    photographer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Verify photographer's bank details (admin only)"""
    user_role = current_user.get("role", "client")
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    admin_id = current_user.get("id") or current_user.get("sub")
    
    result = payout_service.verify_bank_details(photographer_id, admin_id)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
    
    return result


# ==================== Integration with Escrow ====================

@router.post("/earnings/add")
async def add_photographer_earnings(
    photographer_id: str,
    amount: float,
    booking_id: str,
    is_released: bool = False
):
    """
    Add earnings to photographer's account
    Called by escrow service when payment is received or released
    
    This is an internal endpoint - should be called by other services
    """
    result = payout_service.add_earnings(
        photographer_id=photographer_id,
        amount=amount,
        booking_id=booking_id,
        is_released=is_released
    )
    return result


@router.post("/earnings/release")
async def release_photographer_earnings(
    photographer_id: str,
    amount: float,
    booking_id: str
):
    """
    Release earnings from escrow to available balance
    Called when escrow period ends
    
    This is an internal endpoint - should be called by escrow service
    """
    result = payout_service.release_earnings(
        photographer_id=photographer_id,
        amount=amount,
        booking_id=booking_id
    )
    return result
