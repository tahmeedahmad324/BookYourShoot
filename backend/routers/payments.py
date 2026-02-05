from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, Literal, List
from datetime import datetime
from backend.services.payment_service import payment_service
from backend.services.escrow_service import escrow_service
from backend.services.notification_service import notification_service
from backend.services.receipt_service import receipt_service
from backend.services.email_service import email_service
from backend.services.escalation_service import escalation_service
from backend.services.webhook_service import webhook_simulator

router = APIRouter(prefix="/payments", tags=["payments"])


# Payment Models
class PaymentRequest(BaseModel):
    booking_id: str
    amount: float
    currency: str = "PKR"
    payment_method: Literal["jazzcash", "easypaisa", "card", "bank"]
    payment_type: Literal["advance", "final", "full", "refund"] = "advance"
    customer_phone: str
    customer_email: Optional[str] = None
    # Additional metadata for receipt/notifications
    client_name: Optional[str] = None
    photographer_name: Optional[str] = None
    photographer_id: Optional[str] = None
    service_type: Optional[str] = None
    event_date: Optional[str] = None
    total_price: Optional[float] = None  # Full booking price
    advance_payment: Optional[float] = None  # Amount being paid now


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
        
        # Prepare metadata for receipt/notifications
        is_equipment_rental = "equipment" in (payment.service_type or "").lower() or "rental" in (payment.service_type or "").lower()
        metadata = {
            "client_name": payment.client_name or "Client",
            "client_email": payment.customer_email or "client@example.com",
            "photographer_name": payment.photographer_name or "Photographer",
            "photographer_id": payment.photographer_id or "",
            "service_type": payment.service_type or "Photography Service",
            "event_date": payment.event_date or "",
            "total_price": str(payment.total_price or payment.amount),
            "advance_payment": str(payment.advance_payment or payment.amount),
            "is_equipment_rental": "true" if is_equipment_rental else "false"
        }
        
        # Create checkout session with metadata
        result = gateway.create_checkout(
            amount=payment.amount,
            booking_id=payment.booking_id,
            customer_info=customer_info,
            currency=payment.currency,
            metadata=metadata
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
    Check the status of a payment and auto-generate receipt if successful
    """
    try:
        gateway = payment_service.get_gateway("stripe")
        result = gateway.verify_payment(payment_id)
        
        print(f"🔍 Payment verification result: status={result.get('status')}, metadata={result.get('metadata')}")
        
        # Auto-generate receipt on successful payment
        if result.get("status") == "success" or result.get("payment_status") == "paid":
            try:
                # Get metadata from the session
                metadata = result.get("metadata", {})
                print(f"📋 Receipt metadata: {metadata}")
                
                amount = result.get("amount_total", result.get("amount", 0))
                if isinstance(amount, (int, float)) and amount > 100:
                    amount = amount / 100  # Convert from paisa/cents
                
                platform_fee = amount * 0.1  # 10% platform fee
                subtotal = amount - platform_fee
                
                # Generate receipt with actual booking data
                client_name = metadata.get("client_name", "Client")
                photographer_name = metadata.get("photographer_name", "Photographer")
                print(f"🧾 Generating receipt for: client={client_name}, photographer={photographer_name}")
                
                receipt = receipt_service.generate_receipt(
                    transaction_id=payment_id,
                    booking_id=metadata.get("booking_id", payment_id),
                    client_name=client_name,
                    client_email=metadata.get("client_email", "client@example.com"),
                    photographer_name=photographer_name,
                    service_type=metadata.get("service_type", "Photography Service"),
                    session_date=metadata.get("event_date", datetime.now().strftime("%Y-%m-%d")),
                    subtotal=subtotal,
                    platform_fee=platform_fee,
                    total=amount,
                    payment_method="Stripe"
                )
                result["receipt_available"] = True
                result["receipt_id"] = payment_id
            except Exception as e:
                print(f"⚠️ Failed to auto-generate receipt: {e}")
                result["receipt_available"] = False
        
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


# ==================== Remaining Payment (50% after work) ====================

class RemainingPaymentRequest(BaseModel):
    booking_id: str
    amount: float  # Should be 50% of total
    currency: str = "PKR"
    payment_method: Literal["jazzcash", "easypaisa", "card", "bank"] = "card"
    customer_phone: str
    customer_email: Optional[str] = None
    client_name: Optional[str] = None
    photographer_name: Optional[str] = None
    photographer_id: Optional[str] = None
    service_type: Optional[str] = None


@router.post("/remaining-payment")
async def create_remaining_payment(payment: RemainingPaymentRequest):
    """
    Create checkout session for remaining 50% payment after work completion.
    This is paid by the client after the photographer completes the work.
    
    Flow:
    1. Client pays 50% advance (handled by /create-checkout)
    2. Photographer completes work
    3. Client confirms work done and pays remaining 50% (this endpoint)
    4. After payment, funds are added to escrow and then released based on policy
    """
    try:
        gateway = payment_service.get_gateway("stripe")
        
        customer_info = {
            "phone": payment.customer_phone,
            "email": payment.customer_email
        }
        
        metadata = {
            "payment_type": "remaining_payment",
            "client_name": payment.client_name or "Client",
            "client_email": payment.customer_email or "",
            "photographer_name": payment.photographer_name or "Photographer",
            "photographer_id": payment.photographer_id or "",
            "service_type": payment.service_type or "Photography Service",
            "is_final_payment": "true"
        }
        
        result = gateway.create_checkout(
            amount=payment.amount,
            booking_id=f"{payment.booking_id}_remaining",
            customer_info=customer_info,
            currency=payment.currency,
            metadata=metadata
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        # Notify client about remaining payment due (reminder)
        if payment.customer_email:
            notification_service.notify_remaining_payment_due(
                client_id=payment.customer_email,
                booking_id=payment.booking_id,
                remaining_amount=payment.amount,
                photographer_name=payment.photographer_name or "Photographer",
                service_type=payment.service_type or "Photography Service"
            )
        
        return {
            "status": "success",
            "payment_id": result.get("transaction_id", ""),
            "checkout_url": result.get("checkout_url"),
            "message": "Remaining payment checkout created. Client will pay final 50%."
        }
    except ValueError as e:
        raise HTTPException(status_code=503, detail=f"Payment service unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Escrow Management Endpoints
class EscrowCreateRequest(BaseModel):
    transaction_id: str
    booking_id: str
    amount: float
    client_id: str
    photographer_id: str
    photographer_name: str = "Photographer"
    transaction_type: str = "booking"
    deposit_amount: float = 0
    escrow_status: str = "held"
    escrow_release_date: Optional[str] = None


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
        
        # Send notifications to both parties
        notification_service.notify_payment_received(
            client_id=escrow.client_id,
            photographer_id=escrow.photographer_id,
            booking_id=escrow.booking_id,
            amount=escrow.amount,
            photographer_name=escrow.photographer_name
        )
        notification_service.notify_payment_held(
            client_id=escrow.client_id,
            photographer_id=escrow.photographer_id,
            booking_id=escrow.booking_id,
            amount=escrow.amount
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
        # Get transaction before release for notification data
        transaction = escrow_service.get_transaction(transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        result = escrow_service.release_to_photographer(
            transaction_id=transaction_id,
            reason=release.reason
        )
        
        if result.get("status") == "failed":
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        # Send release notifications
        total_amount = transaction.get("amount", 0)
        platform_fee = result.get("platform_fee", total_amount * 0.1)
        photographer_amount = result.get("photographer_amount", total_amount * 0.9)
        
        notification_service.notify_payment_released(
            client_id=transaction.get("client_id", "unknown"),
            photographer_id=transaction.get("photographer_id", "unknown"),
            booking_id=transaction.get("booking_id", "unknown"),
            total_amount=total_amount,
            photographer_amount=photographer_amount,
            platform_fee=platform_fee
        )
        
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
        # Get transaction before refund for notification data
        transaction = escrow_service.get_transaction(transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        result = escrow_service.refund_to_client(
            transaction_id=transaction_id,
            booking_date=refund.booking_date,
            reason=refund.reason
        )
        
        if result.get("status") == "failed":
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        # Send refund notifications
        notification_service.notify_payment_refunded(
            client_id=transaction.get("client_id", "unknown"),
            photographer_id=transaction.get("photographer_id", "unknown"),
            booking_id=transaction.get("booking_id", "unknown"),
            refund_amount=result.get("client_refund", 0),
            photographer_compensation=result.get("photographer_payment", 0),
            policy=result.get("policy", "Cancellation")
        )
        
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


# ============================================
# Notification Endpoints
# ============================================

@router.get("/notifications/test/{user_id}")
async def create_test_notification(user_id: str):
    """
    Create a test notification for debugging (GET for easy browser testing)
    """
    notification_service.notify_booking_confirmed(
        client_id=user_id,
        photographer_id="photographer@test.com",
        booking_id="TEST-123",
        photographer_name="Test Photographer",
        service_type="Wedding Photography",
        date="2026-01-20"
    )
    return {
        "status": "success",
        "message": f"Test notification created for {user_id}"
    }


@router.get("/notifications/admin/all")
async def get_all_notifications_admin():
    """
    Admin: Get all notifications (for debugging/monitoring)
    """
    notifications = notification_service.get_all_notifications()
    return {
        "status": "success",
        "count": len(notifications),
        "notifications": notifications
    }


@router.get("/notifications/{user_id}")
async def get_user_notifications(user_id: str, unread_only: bool = False):
    """
    Get all notifications for a user
    """
    notifications = notification_service.get_user_notifications(user_id, unread_only)
    return {
        "status": "success",
        "count": len(notifications),
        "unread_count": notification_service.get_unread_count(user_id),
        "notifications": notifications
    }


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """
    Mark a notification as read
    """
    success = notification_service.mark_read(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success", "message": "Notification marked as read"}


@router.post("/notifications/{user_id}/read-all")
async def mark_all_notifications_read(user_id: str):
    """
    Mark all notifications as read for a user
    """
    count = notification_service.mark_all_read(user_id)
    return {"status": "success", "message": f"Marked {count} notifications as read", "count": count}


# ============================================
# Dispute Management Endpoints
# ============================================

class DisputeRequest(BaseModel):
    booking_id: str
    client_id: str
    photographer_id: str
    reason: str
    description: str


class DisputeResolveRequest(BaseModel):
    resolution: str  # "full_refund", "partial_refund", "no_refund", "split"
    client_refund_percent: float = 0  # 0-100
    notes: str = ""


# In-memory dispute storage for demo
disputes = {}


@router.post("/disputes/create")
async def create_dispute(dispute: DisputeRequest):
    """
    Create a dispute for a booking
    """
    dispute_id = f"DISP-{dispute.booking_id}"
    
    disputes[dispute_id] = {
        "id": dispute_id,
        "booking_id": dispute.booking_id,
        "client_id": dispute.client_id,
        "photographer_id": dispute.photographer_id,
        "reason": dispute.reason,
        "description": dispute.description,
        "status": "open",
        "created_at": datetime.now().isoformat(),
        "resolved_at": None,
        "resolution": None
    }
    
    # Send notifications
    notification_service.notify_dispute_opened(
        client_id=dispute.client_id,
        photographer_id=dispute.photographer_id,
        booking_id=dispute.booking_id,
        reason=dispute.reason
    )
    
    return {
        "status": "success",
        "message": "Dispute created and admin notified",
        "dispute": disputes[dispute_id]
    }


@router.get("/disputes")
async def list_disputes(status: str = None):
    """
    Admin: List all disputes
    """
    dispute_list = list(disputes.values())
    if status:
        dispute_list = [d for d in dispute_list if d["status"] == status]
    return {
        "status": "success",
        "count": len(dispute_list),
        "disputes": sorted(dispute_list, key=lambda x: x["created_at"], reverse=True)
    }


@router.get("/disputes/{dispute_id}")
async def get_dispute(dispute_id: str):
    """
    Get dispute details
    """
    if dispute_id not in disputes:
        raise HTTPException(status_code=404, detail="Dispute not found")
    return {"status": "success", "dispute": disputes[dispute_id]}


@router.post("/disputes/{dispute_id}/resolve")
async def resolve_dispute(dispute_id: str, resolution: DisputeResolveRequest):
    """
    Admin: Resolve a dispute
    """
    if dispute_id not in disputes:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    dispute = disputes[dispute_id]
    if dispute["status"] != "open":
        raise HTTPException(status_code=400, detail="Dispute already resolved")
    
    # Get escrow transaction
    transaction = escrow_service.get_transaction_by_booking(dispute["booking_id"])
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found for this booking")
    
    total_amount = transaction.get("amount", 0)
    client_refund = total_amount * (resolution.client_refund_percent / 100)
    photographer_amount = total_amount - client_refund
    
    # Update dispute
    dispute["status"] = "resolved"
    dispute["resolved_at"] = datetime.now().isoformat()
    dispute["resolution"] = {
        "type": resolution.resolution,
        "client_refund": client_refund,
        "photographer_amount": photographer_amount,
        "notes": resolution.notes
    }
    
    # Send notifications
    resolution_msg = f"Dispute resolved: Client receives Rs. {client_refund:,.0f}, Photographer receives Rs. {photographer_amount:,.0f}"
    notification_service.notify_dispute_resolved(
        client_id=dispute["client_id"],
        photographer_id=dispute["photographer_id"],
        booking_id=dispute["booking_id"],
        resolution=resolution_msg,
        client_amount=client_refund,
        photographer_amount=photographer_amount
    )
    
    return {
        "status": "success",
        "message": "Dispute resolved successfully",
        "dispute": dispute
    }


# ============ BOOKING EMAIL ENDPOINT ============

class SendBookingEmailRequest(BaseModel):
    client_email: str  # Email address for sending confirmation
    client_name: str
    photographer_name: str
    booking_id: str
    service_type: str
    event_date: str
    event_time: Optional[str] = None
    location: Optional[str] = None
    amount: float
    advance_paid: Optional[float] = None
    photographer_id: Optional[str] = None  # Used for notifications
    notification_user_id: Optional[str] = None  # Auth user ID for notifications (if different from client_email)
    
    class Config:
        # Allow extra fields to be ignored
        extra = "ignore"


@router.post("/send-booking-email")
async def send_booking_confirmation_email(request: SendBookingEmailRequest):
    """Send booking confirmation email to client AND photographer, create notifications"""
    print(f"📧 Received send-booking-email request: {request.dict()}")
    try:
        # Calculate amounts for 50/50 payment model
        total_amount = request.amount
        advance_amount = request.advance_paid or (total_amount * 0.5)
        remaining_amount = total_amount - advance_amount
        photographer_earnings = total_amount * 0.9  # After 10% platform fee
        
        # Send booking confirmation email to client
        result = email_service.send_booking_confirmation(
            client_email=request.client_email,
            client_name=request.client_name,
            photographer_name=request.photographer_name,
            service_type=request.service_type,
            date=request.event_date,
            time=request.event_time or "TBD",
            location=request.location or "TBD",
            amount=total_amount,
            advance_paid=advance_amount
        )
        print(f"📧 Client email sent: {result}")
        
        # Also send advance payment received email for clarity
        email_service.send_advance_payment_received(
            client_email=request.client_email,
            client_name=request.client_name,
            booking_id=request.booking_id,
            service_type=request.service_type,
            photographer_name=request.photographer_name,
            date=request.event_date,
            advance_amount=advance_amount,
            remaining_amount=remaining_amount
        )
        
        # Create notifications for both client and photographer
        photographer_id = request.photographer_id or request.photographer_name
        notification_client_id = request.notification_user_id or request.client_email
        print(f"🔔 Creating notifications for client: {notification_client_id}")
        
        # Notify both parties about advance payment received (50/50 flow)
        notification_service.notify_advance_payment_received(
            client_id=notification_client_id,
            photographer_id=photographer_id,
            booking_id=request.booking_id,
            advance_amount=advance_amount,
            remaining_amount=remaining_amount,
            photographer_name=request.photographer_name,
            service_type=request.service_type,
            date=request.event_date
        )
        
        print(f"✅ 50/50 payment notifications created for booking {request.booking_id}")
        
        return {
            "status": "success",
            "message": "Booking confirmation email sent with 50/50 payment details",
            "email_sent": True,
            "notifications_created": True,
            "payment_model": "50/50",
            "advance_amount": advance_amount,
            "remaining_amount": remaining_amount
        }
    except Exception as e:
        print(f"❌ Failed to send booking email: {e}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
            "email_sent": False
        }


# Equipment Rental Email Endpoint
class SendEquipmentRentalEmailRequest(BaseModel):
    client_email: str
    client_name: str
    rental_id: str
    equipment_name: str
    equipment_category: str
    rental_period: str  # e.g., "7 days", "1 week", "1 month"
    start_date: str
    owner_name: str
    owner_phone: str
    rental_cost: float
    deposit: float
    total_amount: float
    notification_user_id: Optional[str] = None  # Auth user email for notifications
    
    class Config:
        extra = "ignore"


@router.post("/send-equipment-rental-email")
async def send_equipment_rental_confirmation_email(request: SendEquipmentRentalEmailRequest):
    """Send equipment rental confirmation email to client AND create notifications"""
    print(f"📧 Received equipment rental email request: {request.dict()}")
    try:
        # Send equipment rental confirmation email
        result = email_service.send_equipment_rental_confirmation(
            client_email=request.client_email,
            client_name=request.client_name,
            equipment_name=request.equipment_name,
            equipment_category=request.equipment_category,
            rental_period=request.rental_period,
            start_date=request.start_date,
            owner_name=request.owner_name,
            owner_phone=request.owner_phone,
            rental_cost=request.rental_cost,
            deposit=request.deposit,
            total_amount=request.total_amount
        )
        print(f"📧 Equipment rental email result: {result}")
        
        # Create notification for client
        notification_client_id = request.notification_user_id or request.client_email
        print(f"🔔 Creating equipment rental notification for client: {notification_client_id}")
        
        # Import NotificationType for proper notification creation
        from backend.services.notification_service import NotificationType
        
        # Add equipment rental notification
        rental_notif = notification_service._create_notification(
            user_id=notification_client_id,
            notification_type=NotificationType.BOOKING_CONFIRMED,
            title="Equipment Rental Confirmed 🎥",
            message=f"Your rental of {request.equipment_name} is confirmed! Contact {request.owner_name} at {request.owner_phone} to arrange pickup.",
            data={
                "rental_id": request.rental_id,
                "equipment_name": request.equipment_name,
                "amount": request.total_amount
            },
            amount=request.total_amount
        )
        notification_service.send(rental_notif)
        
        # Payment received notification
        payment_notif = notification_service._create_notification(
            user_id=notification_client_id,
            notification_type=NotificationType.PAYMENT_RECEIVED,
            title="Payment Received 💳",
            message=f"PKR {request.total_amount:,.0f} received for {request.equipment_name} rental. Deposit: PKR {request.deposit:,.0f} (refundable)",
            data={
                "rental_id": request.rental_id,
                "amount": request.total_amount
            },
            amount=request.total_amount
        )
        notification_service.send(payment_notif)
        
        print(f"✅ Notifications created for equipment rental {request.rental_id}")
        
        return {
            "status": "success",
            "message": "Equipment rental confirmation email sent and notifications created",
            "email_sent": True,
            "notifications_created": True
        }
    except Exception as e:
        print(f"❌ Failed to send equipment rental email: {e}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
            "email_sent": False
        }


# ============ RECEIPT ENDPOINTS ============

class GenerateReceiptRequest(BaseModel):
    transaction_id: str
    client_name: str
    client_email: str
    photographer_name: str
    service_type: str
    session_date: str
    subtotal: float
    platform_fee: float
    total: float
    status: str = "held"  # held, released, refunded
    payment_method: str = "Card"
    booking_id: str = None


@router.post("/receipts/generate")
def generate_receipt(payload: GenerateReceiptRequest):
    """Generate a payment receipt"""
    receipt = receipt_service.generate_receipt(
        transaction_id=payload.transaction_id,
        client_name=payload.client_name,
        client_email=payload.client_email,
        photographer_name=payload.photographer_name,
        service_type=payload.service_type,
        session_date=payload.session_date,
        subtotal=payload.subtotal,
        platform_fee=payload.platform_fee,
        total=payload.total,
        status=payload.status,
        payment_method=payload.payment_method,
        booking_id=payload.booking_id
    )
    
    # Also send email receipt
    email_service.send_payment_receipt(
        client_email=payload.client_email,
        client_name=payload.client_name,
        transaction_id=payload.transaction_id,
        photographer_name=payload.photographer_name,
        service_type=payload.service_type,
        subtotal=payload.subtotal,
        platform_fee=payload.platform_fee,
        total=payload.total
    )
    
    return {
        "success": True,
        "receipt": receipt["data"],
        "html_base64": receipt["html_base64"]
    }


@router.get("/receipts/{transaction_id}")
def get_receipt(transaction_id: str):
    """Get receipt data by transaction ID"""
    receipt = receipt_service.get_receipt_data(transaction_id)
    if not receipt:
        # Try to generate a demo receipt if none exists
        receipt = receipt_service.generate_receipt(
            transaction_id=transaction_id,
            booking_id=transaction_id,
            client_name="Client",
            client_email="client@bookyourshoot.com",
            photographer_name="Photographer",
            service_type="Photography Service",
            session_date=datetime.now().strftime("%Y-%m-%d"),
            subtotal=13500,
            platform_fee=1500,
            total=15000,
            payment_method="Stripe"
        )
        if receipt:
            return {"success": True, "receipt": receipt.get("data", receipt)}
        raise HTTPException(status_code=404, detail="Receipt not found")
    return {"success": True, "receipt": receipt}


@router.get("/receipts/{transaction_id}/html", response_class=HTMLResponse)
def get_receipt_html(transaction_id: str):
    """Get receipt as HTML for printing/download"""
    html = receipt_service.get_receipt_html(transaction_id)
    if not html:
        # Try to generate a demo receipt if none exists
        receipt = receipt_service.generate_receipt(
            transaction_id=transaction_id,
            booking_id=transaction_id,
            client_name="Client",
            client_email="client@bookyourshoot.com",
            photographer_name="Photographer",
            service_type="Photography Service",
            session_date=datetime.now().strftime("%Y-%m-%d"),
            subtotal=13500,
            platform_fee=1500,
            total=15000,
            payment_method="Stripe"
        )
        if receipt:
            html = receipt_service.get_receipt_html(transaction_id)
            if html:
                return HTMLResponse(content=html)
        raise HTTPException(status_code=404, detail="Receipt not found")
    return HTMLResponse(content=html)


@router.get("/receipts/{transaction_id}/pdf")
def get_receipt_pdf(transaction_id: str):
    """Get receipt as PDF for download"""
    from fastapi.responses import Response
    
    receipt = receipt_service.get_receipt(transaction_id)
    if not receipt:
        # Try to generate a demo receipt if none exists
        generated = receipt_service.generate_receipt(
            transaction_id=transaction_id,
            booking_id=transaction_id,
            client_name="Client",
            client_email="client@bookyourshoot.com",
            photographer_name="Photographer",
            service_type="Photography Service",
            session_date=datetime.now().strftime("%Y-%m-%d"),
            subtotal=13500,
            platform_fee=1500,
            total=15000,
            payment_method="Stripe"
        )
        if generated:
            receipt = receipt_service.get_receipt(transaction_id)
    
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    if not receipt.get("pdf_base64"):
        raise HTTPException(
            status_code=400, 
            detail="PDF not available. Install fpdf2: pip install fpdf2"
        )
    
    import base64
    pdf_bytes = base64.b64decode(receipt["pdf_base64"])
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=receipt_{transaction_id}.pdf"
        }
    )


@router.get("/receipts")
def list_receipts(client_email: str = None):
    """List all receipts, optionally filtered by client email"""
    receipts = receipt_service.get_all_receipts(client_email)
    return {"success": True, "receipts": receipts}


@router.get("/receipts/{transaction_id}/qr")
def get_receipt_qr(transaction_id: str):
    """Get QR code image for a receipt"""
    from fastapi.responses import Response
    
    receipt = receipt_service.get_receipt(transaction_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    if not receipt.get("qr_base64"):
        raise HTTPException(
            status_code=400, 
            detail="QR code not available. Install qrcode: pip install qrcode"
        )
    
    import base64
    qr_bytes = base64.b64decode(receipt["qr_base64"])
    
    return Response(
        content=qr_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": f"inline; filename=qr_{transaction_id}.png"
        }
    )


# ============ ESCALATION ENDPOINTS ============

@router.post("/escalation/check")
def check_dispute_escalations():
    """Check all open disputes for escalation (called by scheduler or manually)"""
    # Get all open disputes
    open_disputes = [d for d in disputes.values() if d.get("status") in ["open", "under_review"]]
    
    escalations = escalation_service.check_all_disputes(open_disputes)
    
    return {
        "success": True,
        "checked_count": len(open_disputes),
        "escalated_count": len(escalations),
        "escalations": [e.to_dict() for e in escalations]
    }


@router.get("/escalation/prioritized")
def get_prioritized_disputes():
    """Get disputes grouped by escalation priority for admin dashboard"""
    all_disputes = list(disputes.values())
    prioritized = escalation_service.get_escalated_disputes(all_disputes)
    
    return {
        "success": True,
        "prioritized": prioritized,
        "counts": {
            "critical": len(prioritized["critical"]),
            "high": len(prioritized["high"]),
            "attention": len(prioritized["attention"]),
            "normal": len(prioritized["normal"])
        }
    }


@router.get("/escalation/history")
def get_escalation_history(dispute_id: str = None):
    """Get escalation history for a dispute or all disputes"""
    history = escalation_service.get_escalation_history(dispute_id)
    return {"success": True, "history": history}


class SimulateEscalationRequest(BaseModel):
    dispute_id: str = "DEMO-001"
    level: str = "high"  # attention, high, critical


@router.post("/escalation/simulate")
def simulate_escalation(payload: SimulateEscalationRequest):
    """Simulate an escalation for demo purposes"""
    event = escalation_service.simulate_escalation(
        dispute_id=payload.dispute_id,
        level=payload.level
    )
    return {
        "success": True,
        "message": f"Simulated {payload.level} priority escalation",
        "event": event.to_dict()
    }


# ============ WEBHOOK SIMULATION ENDPOINTS ============

class SimulateWebhookRequest(BaseModel):
    event_type: str = "checkout.session.completed"  # Stripe event type
    booking_id: str
    amount: float
    client_email: str = "client@example.com"
    client_name: str = "Test Client"
    photographer_name: str = "Test Photographer"
    photographer_email: str = "photographer@example.com"
    metadata: dict = {}


@router.post("/webhooks/simulate")
def simulate_webhook(payload: SimulateWebhookRequest):
    """
    Simulate a webhook event for testing payment flows
    
    Supported event types:
    - checkout.session.completed (Stripe)
    - payment_intent.succeeded (Stripe)
    - payment_intent.payment_failed (Stripe)
    - charge.refunded (Stripe)
    - jazzcash.payment.success
    - easypaisa.payment.success
    """
    try:
        event = webhook_simulator.simulate_event(
            event_type=payload.event_type,
            booking_id=payload.booking_id,
            amount=payload.amount,
            client_email=payload.client_email,
            client_name=payload.client_name,
            photographer_name=payload.photographer_name,
            photographer_email=payload.photographer_email,
            metadata=payload.metadata
        )
        return {
            "success": True,
            "message": f"Webhook event '{payload.event_type}' simulated successfully",
            "event": event.to_dict()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/webhooks/events")
def get_webhook_events(limit: int = 50):
    """Get recent webhook events for debugging"""
    events = webhook_simulator.get_event_log(limit)
    return {
        "success": True,
        "count": len(events),
        "events": events
    }


@router.get("/webhooks/events/{event_id}")
def get_webhook_event(event_id: str):
    """Get a specific webhook event by ID"""
    event = webhook_simulator.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"success": True, "event": event}


@router.post("/webhooks/signature/generate")
def generate_webhook_signature(payload: dict):
    """Generate a mock webhook signature for testing verification"""
    import json
    payload_str = json.dumps(payload)
    signature = webhook_simulator.generate_signature(payload_str)
    return {
        "success": True,
        "signature": signature,
        "payload": payload_str
    }


@router.get("/webhooks/supported-events")
def get_supported_webhook_events():
    """Get list of supported webhook event types for simulation"""
    return {
        "success": True,
        "events": [
            {
                "type": "checkout.session.completed",
                "source": "stripe",
                "description": "Checkout session completed successfully, payment received"
            },
            {
                "type": "payment_intent.succeeded",
                "source": "stripe",
                "description": "Payment intent succeeded"
            },
            {
                "type": "payment_intent.payment_failed",
                "source": "stripe",
                "description": "Payment intent failed"
            },
            {
                "type": "charge.refunded",
                "source": "stripe",
                "description": "Charge was refunded"
            },
            {
                "type": "charge.dispute.created",
                "source": "stripe",
                "description": "Customer opened a dispute"
            },
            {
                "type": "jazzcash.payment.success",
                "source": "jazzcash",
                "description": "JazzCash payment successful"
            },
            {
                "type": "jazzcash.payment.failed",
                "source": "jazzcash",
                "description": "JazzCash payment failed"
            },
            {
                "type": "easypaisa.payment.success",
                "source": "easypaisa",
                "description": "EasyPaisa payment successful"
            },
            {
                "type": "easypaisa.payment.failed",
                "source": "easypaisa",
                "description": "EasyPaisa payment failed"
            }
        ]
    }


class SimulateFullFlowRequest(BaseModel):
    booking_id: str
    amount: float
    client_email: str = "client@example.com"
    client_name: str = "Test Client"
    photographer_name: str = "Test Photographer"
    photographer_email: str = "photographer@example.com"
    service_type: str = "Photography Session"
    session_date: str = None


@router.post("/webhooks/simulate-full-flow")
def simulate_full_payment_flow(payload: SimulateFullFlowRequest):
    """
    Simulate a complete payment flow:
    1. Checkout session completed
    2. Payment held in escrow
    3. Notifications sent
    4. Receipt generated
    5. Email sent
    
    This is useful for demo/testing the entire payment system
    """
    from datetime import datetime
    
    session_date = payload.session_date or datetime.now().strftime("%Y-%m-%d")
    
    # Simulate checkout completed (this triggers the full flow)
    event = webhook_simulator.simulate_event(
        event_type="checkout.session.completed",
        booking_id=payload.booking_id,
        amount=payload.amount,
        client_email=payload.client_email,
        client_name=payload.client_name,
        photographer_name=payload.photographer_name,
        photographer_email=payload.photographer_email,
        metadata={
            "service_type": payload.service_type,
            "session_date": session_date
        }
    )
    
    return {
        "success": True,
        "message": "Full payment flow simulated successfully",
        "flow_steps": [
            "✅ Checkout session completed",
            "✅ Payment held in escrow",
            "✅ Client notification sent",
            "✅ Photographer notification sent",
            "✅ Receipt generated",
            "✅ Confirmation email sent"
        ],
        "event": event.to_dict(),
        "next_steps": [
            "Wait for shoot completion",
            "Release escrow after 48 hours (or manual release)",
            "Or, client/photographer can raise a dispute"
        ]
    }


# =============================================================================
# TIP ENDPOINTS - Clients can tip photographers after completed sessions
# =============================================================================


@router.get("/tips/booking/{booking_id}")
async def get_tip_for_booking(booking_id: str):
    """
    Check if a tip has been sent for a specific booking
    """
    tip = tip_service.get_tip_by_booking(booking_id)
    if tip:
        return {
            "status": "success",
            "tip_sent": True,
            "tip": tip
        }
    return {
        "status": "success",
        "tip_sent": False,
        "tip": None
    }


@router.get("/tips/photographer/{photographer_id}")
async def get_photographer_tips(photographer_id: str):
    """
    Get all tips received by a photographer
    """
    tips = tip_service.get_photographer_tips(photographer_id)
    stats = tip_service.get_photographer_tip_stats(photographer_id)
    
    return {
        "status": "success",
        "tips": tips,
        "stats": stats
    }


@router.get("/tips/client/{client_id}")
async def get_client_tips(client_id: str):
    """
    Get all tips sent by a client
    """
    tips = tip_service.get_client_tips(client_id)
    total = sum(t["amount"] for t in tips)
    
    return {
        "status": "success",
        "tips": tips,
        "total_tipped": total,
        "tip_count": len(tips)
    }


@router.get("/tips/leaderboard")
async def get_tip_leaderboard(limit: int = 10):
    """
    Get photographers with most tips (admin view)
    """
    leaderboard = tip_service.get_tip_leaderboard(limit)
    return {
        "status": "success",
        "leaderboard": leaderboard
    }
