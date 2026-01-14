from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
from backend.services.payment_service import payment_service
from backend.services.escrow_service import escrow_service

router = APIRouter(prefix="/payments", tags=["payments"])


# Payment Models
class PaymentRequest(BaseModel):
    booking_id: str
    amount: float
    currency: str = "PKR"
    payment_method: Literal["jazzcash", "easypaisa", "card", "bank"]
    customer_phone: str
    customer_email: Optional[str] = None


class PaymentResponse(BaseModel):
    payment_id: str
    status: str
    checkout_url: Optional[str] = None
    qr_code: Optional[str] = None
    message: str


class PaymentWebhook(BaseModel):
    transaction_id: str
    status: str
    amount: float
    booking_id: str
    payment_method: str


# Payment Endpoints
@router.post("/create-checkout", response_model=PaymentResponse)
async def create_checkout(payment: PaymentRequest):
    """
    Create a payment checkout session
    This will redirect user to payment gateway
    """
    try:
        # Get the Stripe gateway
        gateway = payment_service.get_gateway("stripe")
        
        # Prepare customer info
        customer_info = {
            "phone": payment.customer_phone,
            "email": payment.customer_email
        }
        
        # Create checkout session
        result = gateway.create_checkout(
            amount=payment.amount,
            booking_id=payment.booking_id,
            customer_info=customer_info,
            currency=payment.currency
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return PaymentResponse(
            payment_id=result.get("transaction_id", ""),
            status=result.get("status", "pending"),
            checkout_url=result.get("checkout_url"),
            message="Payment session created successfully"
        )
    except ValueError as e:
        # Gateway not registered
        raise HTTPException(status_code=503, detail=f"Payment service unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def payment_webhook(webhook_data: PaymentWebhook):
    """
    Webhook endpoint for payment gateway to send updates
    This should be called by the payment provider when payment status changes
    """
    try:
        # TODO: Verify webhook signature
        # TODO: Update booking status in database
        # TODO: Send confirmation emails/notifications
        
        if webhook_data.status == "success":
            # Update booking as paid
            pass
        elif webhook_data.status == "failed":
            # Mark booking as payment failed
            pass
        
        return {"status": "received"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{payment_id}")
async def get_payment_status(payment_id: str):
    """
    Check the status of a payment
    """
    try:
        gateway = payment_service.get_gateway("stripe")
        result = gateway.verify_payment(payment_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=503, detail=f"Payment service unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refund/{payment_id}")
async def refund_payment(payment_id: str, amount: Optional[float] = None):
    """
    Initiate a refund for a payment
    """
    try:
        # TODO: Call payment gateway refund API
        return {
            "refund_id": f"refund_{datetime.now().timestamp()}",
            "status": "processing",
            "message": "Refund initiated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Escrow Management Endpoints
class EscrowCreateRequest(BaseModel):
    transaction_id: str
    booking_id: str
    amount: float
    client_id: str
    photographer_id: str
    transaction_type: str = "booking"
    deposit_amount: float = 0


class EscrowReleaseRequest(BaseModel):
    reason: str = "Work completed"


class EscrowRefundRequest(BaseModel):
    booking_date: str
    reason: str = "Booking cancelled"


@router.post("/escrow/create")
async def create_escrow_transaction(escrow: EscrowCreateRequest):
    """
    Create an escrow transaction after successful payment
    Money is held by platform until work completion
    """
    try:
        transaction = escrow_service.create_escrow(
            transaction_id=escrow.transaction_id,
            booking_id=escrow.booking_id,
            amount=escrow.amount,
            client_id=escrow.client_id,
            photographer_id=escrow.photographer_id,
            transaction_type=escrow.transaction_type,
            deposit_amount=escrow.deposit_amount
        )
        return {
            "status": "success",
            "message": "Escrow created - payment held by platform",
            "escrow": transaction.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/escrow/release/{transaction_id}")
async def release_escrow_payment(transaction_id: str, release: EscrowReleaseRequest):
    """
    Release payment from escrow to photographer
    Called when client confirms work completion
    """
    try:
        result = escrow_service.release_to_photographer(
            transaction_id=transaction_id,
            reason=release.reason
        )
        
        if result.get("status") == "failed":
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/escrow/refund/{transaction_id}")
async def refund_escrow_payment(transaction_id: str, refund: EscrowRefundRequest):
    """
    Refund payment from escrow to client
    Called when booking is cancelled
    Applies cancellation policy
    """
    try:
        result = escrow_service.refund_to_client(
            transaction_id=transaction_id,
            booking_date=refund.booking_date,
            reason=refund.reason
        )
        
        if result.get("status") == "failed":
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/escrow/{transaction_id}")
async def get_escrow_details(transaction_id: str):
    """
    Get escrow transaction details
    """
    transaction = escrow_service.get_transaction(transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.get("/escrow/photographer/{photographer_id}/earnings")
async def get_photographer_earnings(photographer_id: str):
    """
    Get photographer's earnings summary
    Shows held, released, and pending amounts
    """
    try:
        earnings = escrow_service.get_photographer_earnings(photographer_id)
        return earnings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/escrow/deposit/release/{transaction_id}")
async def release_equipment_deposit(transaction_id: str, deduction: float = 0, reason: str = "Equipment returned"):
    """
    Release equipment rental deposit
    Deduct amount if equipment was damaged
    """
    try:
        result = escrow_service.release_deposit(
            transaction_id=transaction_id,
            deduction=deduction,
            reason=reason
        )
        
        if result.get("status") == "failed":
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/escrow/auto-release")
async def auto_release_payments():
    """
    Auto-release payments that have been held for X days
    This should be called by a scheduled job
    """
    try:
        results = escrow_service.auto_release_payments()
        return {
            "status": "success",
            "released_count": len(results),
            "transactions": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

