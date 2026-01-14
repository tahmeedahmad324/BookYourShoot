"""
Webhook Simulation Service - Mock webhook endpoints for testing payment flows
Simulates payment gateway webhooks for demo/testing without real payments

Supports simulation of:
- Stripe webhook events (checkout.session.completed, payment_intent.succeeded, etc.)
- JazzCash callback simulation
- EasyPaisa callback simulation
"""

from datetime import datetime
from typing import Dict, List, Optional, Callable
from enum import Enum
import json
import hashlib
import hmac

try:
    from .notification_service import notification_service
    from .escrow_service import escrow_service
    from .email_service import email_service
    from .receipt_service import receipt_service
except ImportError:
    from notification_service import notification_service
    from escrow_service import escrow_service
    from email_service import email_service
    from receipt_service import receipt_service


class WebhookEventType(Enum):
    # Stripe events
    CHECKOUT_COMPLETED = "checkout.session.completed"
    PAYMENT_SUCCEEDED = "payment_intent.succeeded"
    PAYMENT_FAILED = "payment_intent.payment_failed"
    REFUND_CREATED = "charge.refunded"
    DISPUTE_CREATED = "charge.dispute.created"
    
    # JazzCash events
    JAZZCASH_SUCCESS = "jazzcash.payment.success"
    JAZZCASH_FAILED = "jazzcash.payment.failed"
    
    # EasyPaisa events
    EASYPAISA_SUCCESS = "easypaisa.payment.success"
    EASYPAISA_FAILED = "easypaisa.payment.failed"


class WebhookEvent:
    """Represents a simulated webhook event"""
    def __init__(
        self,
        event_type: WebhookEventType,
        payload: Dict,
        source: str = "stripe"
    ):
        self.id = f"evt_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        self.type = event_type
        self.payload = payload
        self.source = source
        self.created_at = datetime.now()
        self.processed = False
        self.processed_at = None
        self.result = None

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "type": self.type.value,
            "source": self.source,
            "payload": self.payload,
            "created_at": self.created_at.isoformat(),
            "processed": self.processed,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
            "result": self.result
        }


class WebhookSimulator:
    """
    Simulates webhook events for testing payment flows
    Logs events and triggers appropriate handlers
    """
    
    def __init__(self):
        self._event_log: List[WebhookEvent] = []
        self._handlers: Dict[WebhookEventType, Callable] = {}
        self._setup_default_handlers()
        print("🔗 Webhook simulator initialized")

    def _setup_default_handlers(self):
        """Setup default handlers for common webhook events"""
        self._handlers = {
            WebhookEventType.CHECKOUT_COMPLETED: self._handle_checkout_completed,
            WebhookEventType.PAYMENT_SUCCEEDED: self._handle_payment_succeeded,
            WebhookEventType.PAYMENT_FAILED: self._handle_payment_failed,
            WebhookEventType.REFUND_CREATED: self._handle_refund_created,
            WebhookEventType.JAZZCASH_SUCCESS: self._handle_jazzcash_success,
            WebhookEventType.EASYPAISA_SUCCESS: self._handle_easypaisa_success,
        }

    def simulate_event(
        self,
        event_type: str,
        booking_id: str,
        amount: float,
        client_email: str = "client@example.com",
        client_name: str = "Test Client",
        photographer_name: str = "Test Photographer",
        photographer_email: str = "photographer@example.com",
        metadata: Dict = None
    ) -> WebhookEvent:
        """Simulate a webhook event"""
        
        # Map string to enum
        event_type_enum = None
        for evt in WebhookEventType:
            if evt.value == event_type:
                event_type_enum = evt
                break
        
        if not event_type_enum:
            raise ValueError(f"Unknown event type: {event_type}")
        
        # Build payload based on event type
        payload = self._build_payload(
            event_type_enum,
            booking_id,
            amount,
            client_email,
            client_name,
            photographer_name,
            photographer_email,
            metadata
        )
        
        # Create event
        event = WebhookEvent(
            event_type=event_type_enum,
            payload=payload,
            source="stripe" if "checkout" in event_type or "payment" in event_type else event_type.split(".")[0]
        )
        
        # Log event
        self._event_log.append(event)
        self._log_event(event)
        
        # Process event
        self._process_event(event)
        
        return event

    def _build_payload(
        self,
        event_type: WebhookEventType,
        booking_id: str,
        amount: float,
        client_email: str,
        client_name: str,
        photographer_name: str,
        photographer_email: str,
        metadata: Dict = None
    ) -> Dict:
        """Build webhook payload based on event type"""
        
        base_payload = {
            "booking_id": booking_id,
            "amount": amount,
            "currency": "pkr",
            "client_email": client_email,
            "client_name": client_name,
            "photographer_name": photographer_name,
            "photographer_email": photographer_email,
            "metadata": metadata or {}
        }
        
        if event_type == WebhookEventType.CHECKOUT_COMPLETED:
            return {
                "id": f"cs_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "object": "checkout.session",
                "amount_total": int(amount * 100),  # In paisa/cents
                "currency": "pkr",
                "customer_email": client_email,
                "payment_status": "paid",
                "status": "complete",
                "metadata": {
                    "booking_id": booking_id,
                    "client_name": client_name,
                    "photographer_name": photographer_name,
                    **base_payload["metadata"]
                }
            }
        
        elif event_type == WebhookEventType.PAYMENT_SUCCEEDED:
            return {
                "id": f"pi_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "object": "payment_intent",
                "amount": int(amount * 100),
                "currency": "pkr",
                "status": "succeeded",
                "receipt_email": client_email,
                "metadata": base_payload["metadata"]
            }
        
        elif event_type == WebhookEventType.PAYMENT_FAILED:
            return {
                "id": f"pi_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "object": "payment_intent",
                "amount": int(amount * 100),
                "currency": "pkr",
                "status": "failed",
                "last_payment_error": {
                    "code": "card_declined",
                    "message": "Your card was declined."
                },
                "metadata": base_payload["metadata"]
            }
        
        elif event_type in [WebhookEventType.JAZZCASH_SUCCESS, WebhookEventType.EASYPAISA_SUCCESS]:
            return {
                "pp_TxnRefNo": f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "pp_Amount": str(int(amount * 100)),
                "pp_ResponseCode": "000",
                "pp_ResponseMessage": "Successful",
                "pp_MobileNumber": "03001234567",
                "pp_BillReference": booking_id,
                **base_payload
            }
        
        return base_payload

    def _process_event(self, event: WebhookEvent):
        """Process webhook event using registered handler"""
        handler = self._handlers.get(event.type)
        
        if handler:
            try:
                result = handler(event)
                event.processed = True
                event.processed_at = datetime.now()
                event.result = {"success": True, "data": result}
            except Exception as e:
                import traceback
                print(f"❌ ERROR processing webhook: {str(e)}")
                traceback.print_exc()
                event.processed = True
                event.processed_at = datetime.now()
                event.result = {"success": False, "error": str(e)}
        else:
            event.result = {"success": False, "error": "No handler registered"}

    def _handle_checkout_completed(self, event: WebhookEvent) -> Dict:
        """Handle Stripe checkout completed event"""
        payload = event.payload
        metadata = payload.get("metadata", {})
        booking_id = metadata.get("booking_id")
        amount = payload.get("amount_total", 0) / 100  # Convert from paisa
        
        # Create escrow transaction
        transaction = escrow_service.create_escrow(
            transaction_id=event.id,
            booking_id=booking_id,
            amount=amount,
            client_id=payload.get("customer_email"),
            photographer_id=metadata.get("photographer_email", "photographer@example.com")
        )
        
        # Send notifications
        notification_service.notify_payment_received(
            client_id=payload.get("customer_email"),
            photographer_id=metadata.get("photographer_email", "photographer@example.com"),
            booking_id=booking_id,
            amount=amount,
            photographer_name=metadata.get("photographer_name", "Photographer")
        )
        
        notification_service.notify_payment_held(
            client_id=payload.get("customer_email"),
            photographer_id=metadata.get("photographer_email", "photographer@example.com"),
            booking_id=booking_id,
            amount=amount
        )
        
        # Generate receipt
        receipt = receipt_service.generate_receipt(
            transaction_id=event.id,
            client_name=metadata.get("client_name", "Client"),
            client_email=payload.get("customer_email", "client@example.com"),
            photographer_name=metadata.get("photographer_name", "Photographer"),
            service_type=metadata.get("service_type", "Photography Session"),
            session_date=metadata.get("session_date", datetime.now().strftime("%Y-%m-%d")),
            subtotal=amount * 0.9,  # 10% platform fee
            platform_fee=amount * 0.1,
            total=amount,
            status="held"
        )
        
        # Send email
        email_service.send_payment_receipt(
            client_email=payload.get("customer_email", "client@example.com"),
            client_name=metadata.get("client_name", "Client"),
            transaction_id=event.id,
            photographer_name=metadata.get("photographer_name", "Photographer"),
            service_type=metadata.get("service_type", "Photography Session"),
            subtotal=amount * 0.9,
            platform_fee=amount * 0.1,
            total=amount
        )
        
        print(f"✅ Processed checkout.session.completed for booking {booking_id}")
        return {"transaction": transaction, "receipt": receipt["data"]}

    def _handle_payment_succeeded(self, event: WebhookEvent) -> Dict:
        """Handle payment succeeded event"""
        print(f"✅ Payment succeeded: {event.id}")
        return {"status": "processed"}

    def _handle_payment_failed(self, event: WebhookEvent) -> Dict:
        """Handle payment failed event"""
        payload = event.payload
        error = payload.get("last_payment_error", {})
        print(f"❌ Payment failed: {error.get('message', 'Unknown error')}")
        return {"status": "failed", "error": error}

    def _handle_refund_created(self, event: WebhookEvent) -> Dict:
        """Handle refund created event"""
        print(f"↩️ Refund created: {event.id}")
        return {"status": "refunded"}

    def _handle_jazzcash_success(self, event: WebhookEvent) -> Dict:
        """Handle JazzCash success callback"""
        payload = event.payload
        print(f"✅ JazzCash payment successful: {payload.get('pp_TxnRefNo')}")
        return {"status": "processed", "txn_ref": payload.get("pp_TxnRefNo")}

    def _handle_easypaisa_success(self, event: WebhookEvent) -> Dict:
        """Handle EasyPaisa success callback"""
        payload = event.payload
        print(f"✅ EasyPaisa payment successful: {payload.get('pp_TxnRefNo')}")
        return {"status": "processed", "txn_ref": payload.get("pp_TxnRefNo")}

    def _log_event(self, event: WebhookEvent):
        """Log webhook event to console"""
        print(f"\n🔗 WEBHOOK EVENT RECEIVED")
        print(f"   ID: {event.id}")
        print(f"   Type: {event.type.value}")
        print(f"   Source: {event.source}")
        print(f"   Time: {event.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 50)

    def get_event_log(self, limit: int = 50) -> List[Dict]:
        """Get recent webhook events"""
        events = sorted(self._event_log, key=lambda x: x.created_at, reverse=True)
        return [e.to_dict() for e in events[:limit]]

    def get_event(self, event_id: str) -> Optional[Dict]:
        """Get a specific event by ID"""
        for event in self._event_log:
            if event.id == event_id:
                return event.to_dict()
        return None

    def generate_signature(self, payload: str, secret: str = "whsec_test") -> str:
        """Generate webhook signature for testing verification"""
        timestamp = int(datetime.now().timestamp())
        signed_payload = f"{timestamp}.{payload}"
        signature = hmac.new(
            secret.encode(),
            signed_payload.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"t={timestamp},v1={signature}"

    def verify_signature(self, payload: str, signature: str, secret: str = "whsec_test") -> bool:
        """Verify webhook signature (mock verification for demo)"""
        # In demo mode, always return True
        return True


# Global instance
webhook_simulator = WebhookSimulator()
