"""
Payment Service - Abstraction layer for different payment gateways
This allows you to switch between JazzCash, EasyPaisa, Keenu, Stripe (for demo), etc.

For FYP/Demo: Use Stripe (easy testing, no merchant account needed)
For Production in Pakistan: Use JazzCash/EasyPaisa/Keenu (Stripe not available)
"""

from abc import ABC, abstractmethod
from typing import Dict, Optional
import hashlib
import hmac
import json


class PaymentGateway(ABC):
    """Abstract base class for payment gateways"""
    
    @abstractmethod
    def create_checkout(self, amount: float, booking_id: str, customer_info: Dict) -> Dict:
        """Create a payment checkout session"""
        pass
    
    @abstractmethod
    def verify_payment(self, transaction_id: str) -> Dict:
        """Verify payment status"""
        pass
    
    @abstractmethod
    def verify_webhook(self, payload: Dict, signature: str) -> bool:
        """Verify webhook signature"""
        pass
    
    @abstractmethod
    def refund_payment(self, transaction_id: str, amount: Optional[float] = None) -> Dict:
        """Initiate a refund"""
        pass


class StripeGateway(PaymentGateway):
    """
    Stripe payment gateway integration
    PERFECT FOR FYP/DEMO - Easy to test, no merchant account needed
    
    Note: Stripe doesn't support Pakistan in production, but perfect for demos
    Docs: https://stripe.com/docs/api
    """
    
    def __init__(self, secret_key: str, publishable_key: str):
        self.secret_key = secret_key
        self.publishable_key = publishable_key
        # Import stripe library only when this gateway is used
        try:
            import stripe
            self.stripe = stripe
            self.stripe.api_key = secret_key
        except ImportError:
            raise ImportError("Please install stripe: pip install stripe")
    
    def create_checkout(self, amount: float, booking_id: str, customer_info: Dict, currency: str = "pkr", metadata: Dict = None) -> Dict:
        """
        Create Stripe Checkout Session
        For demo, use test card: 4242 4242 4242 4242
        Currency: PKR (Pakistani Rupee) by default
        """
        try:
            # Convert amount to smallest currency unit (paisa for PKR, cents for USD)
            amount_cents = int(amount * 100)
            
            # Build metadata including all booking details
            checkout_metadata = {
                'booking_id': booking_id,
                **(metadata or {})
            }
            
            session = self.stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': currency.lower(),
                        'unit_amount': amount_cents,
                        'product_data': {
                            'name': f'Photography Booking - {booking_id}',
                            'description': 'BookYourShoot Photography Service',
                        },
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f'http://localhost:3000/booking/success?session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=f'http://localhost:3000/booking/request/{booking_id}',
                metadata=checkout_metadata
            )
            
            return {
                "checkout_url": session.url,
                "transaction_id": session.id,
                "status": "pending",
                "session_id": session.id
            }
        except Exception as e:
            return {
                "error": str(e),
                "status": "failed"
            }
    
    def verify_payment(self, transaction_id: str) -> Dict:
        """Verify Stripe payment using session ID"""
        try:
            session = self.stripe.checkout.Session.retrieve(transaction_id)
            print(f"🔍 Stripe session retrieved: payment_status={session.payment_status}")
            print(f"🔍 Session metadata: {session.metadata}")
            
            # Get customer email safely
            customer_email = None
            if session.customer_email:
                customer_email = session.customer_email
            elif session.customer_details and session.customer_details.email:
                customer_email = session.customer_details.email
            
            return {
                "status": "success" if session.payment_status == "paid" else "pending",
                "transaction_id": transaction_id,
                "payment_intent": session.payment_intent,
                "amount": session.amount_total / 100,  # Convert back from cents
                "amount_total": session.amount_total,
                "metadata": dict(session.metadata) if session.metadata else {},  # Convert StripeObject to dict
                "customer_email": customer_email
            }
        except Exception as e:
            print(f"❌ Error verifying payment: {e}")
            return {"status": "failed", "error": str(e)}
    
    def verify_webhook(self, payload: Dict, signature: str) -> bool:
        """Verify Stripe webhook signature"""
        try:
            # Stripe webhook secret (get from dashboard)
            webhook_secret = "whsec_..."  # TODO: Add to environment variables
            event = self.stripe.Webhook.construct_event(
                payload, signature, webhook_secret
            )
            return True
        except Exception as e:
            print(f"Webhook verification failed: {e}")
            return False
    
    def refund_payment(self, transaction_id: str, amount: Optional[float] = None) -> Dict:
        """Refund Stripe payment"""
        try:
            # First, get the payment intent from the session
            session = self.stripe.checkout.Session.retrieve(transaction_id)
            payment_intent = session.payment_intent
            
            # Create refund
            refund_params = {'payment_intent': payment_intent}
            if amount:
                refund_params['amount'] = int(amount * 100)
            
            refund = self.stripe.Refund.create(**refund_params)
            
            return {
                "status": "refund_initiated",
                "refund_id": refund.id,
                "amount": refund.amount / 100
            }
        except Exception as e:
            return {"status": "failed", "error": str(e)}


class PaymentService:
    """
    Main payment service that manages different gateways
    """
    
    def __init__(self):
        self.gateways = {}
    
    def register_gateway(self, name: str, gateway: PaymentGateway):
        """Register a payment gateway"""
        self.gateways[name] = gateway
    
    def get_gateway(self, name: str) -> PaymentGateway:
        """Get a payment gateway by name"""
        if name not in self.gateways:
            raise ValueError(f"Payment gateway '{name}' not registered")
        return self.gateways[name]
    
    def create_payment(self, gateway_name: str, amount: float, booking_id: str, customer_info: Dict) -> Dict:
        """Create a payment using specified gateway"""
        gateway = self.get_gateway(gateway_name)
        return gateway.create_checkout(amount, booking_id, customer_info)
    
    def verify_payment(self, gateway_name: str, transaction_id: str) -> Dict:
        """Verify a payment"""
        gateway = self.get_gateway(gateway_name)
        return gateway.verify_payment(transaction_id)


# Initialize payment service
payment_service = PaymentService()

# Register Stripe gateway for FYP/Demo
# Get test keys from: https://dashboard.stripe.com/test/apikeys
# Uncomment and add your keys:
# payment_service.register_gateway("stripe", StripeGateway(
#     secret_key="sk_test_...",  # Your test secret key
#     publishable_key="pk_test_..."  # Your test publishable key
# ))
