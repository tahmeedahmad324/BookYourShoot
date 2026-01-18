"""
Notification Service - Handles payment and booking notifications
For FYP demo: Uses in-memory storage and console logging
In production: Would integrate with email/SMS providers
"""

from datetime import datetime
from typing import Dict, List, Optional
from enum import Enum


class NotificationType(Enum):
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_HELD = "payment_held"
    PAYMENT_RELEASED = "payment_released"
    PAYMENT_REFUNDED = "payment_refunded"
    BOOKING_CONFIRMED = "booking_confirmed"
    BOOKING_CANCELLED = "booking_cancelled"
    BOOKING_COMPLETED = "booking_completed"
    DISPUTE_OPENED = "dispute_opened"
    DISPUTE_RESOLVED = "dispute_resolved"
    # New 50/50 payment flow notifications
    ADVANCE_PAYMENT_RECEIVED = "advance_payment_received"
    REMAINING_PAYMENT_DUE = "remaining_payment_due"
    REMAINING_PAYMENT_RECEIVED = "remaining_payment_received"
    WORK_COMPLETED = "work_completed"
    PAYOUT_REQUESTED = "payout_requested"
    PAYOUT_PROCESSED = "payout_processed"
    PAYOUT_REJECTED = "payout_rejected"


class Notification:
    def __init__(
        self,
        notification_type: NotificationType,
        recipient_id: str,
        recipient_role: str,  # 'client', 'photographer', 'admin'
        title: str,
        message: str,
        booking_id: Optional[str] = None,
        amount: Optional[float] = None,
        metadata: Optional[Dict] = None
    ):
        self.id = f"notif_{datetime.now().strftime('%Y%m%d%H%M%S')}_{recipient_id[:8]}"
        self.type = notification_type
        self.recipient_id = recipient_id
        self.recipient_role = recipient_role
        self.title = title
        self.message = message
        self.booking_id = booking_id
        self.amount = amount
        self.metadata = metadata or {}
        self.created_at = datetime.now()
        self.read = False

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "type": self.type.value,
            "recipient_id": self.recipient_id,
            "recipient_role": self.recipient_role,
            "title": self.title,
            "message": self.message,
            "booking_id": self.booking_id,
            "amount": self.amount,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "read": self.read
        }


class NotificationService:
    """
    In-memory notification service for FYP demo
    Stores notifications and logs to console
    """
    
    def __init__(self):
        self.notifications: List[Notification] = []
        print("📧 Notification service initialized")

    def _log_notification(self, notification: Notification):
        """Console log for demo purposes"""
        emoji = {
            NotificationType.PAYMENT_RECEIVED: "💳",
            NotificationType.PAYMENT_HELD: "🔒",
            NotificationType.PAYMENT_RELEASED: "💰",
            NotificationType.PAYMENT_REFUNDED: "↩️",
            NotificationType.BOOKING_CONFIRMED: "✅",
            NotificationType.BOOKING_CANCELLED: "❌",
            NotificationType.BOOKING_COMPLETED: "🎉",
            NotificationType.DISPUTE_OPENED: "⚠️",
            NotificationType.DISPUTE_RESOLVED: "✔️",
            NotificationType.ADVANCE_PAYMENT_RECEIVED: "💵",
            NotificationType.REMAINING_PAYMENT_DUE: "⏰",
            NotificationType.REMAINING_PAYMENT_RECEIVED: "✅",
            NotificationType.WORK_COMPLETED: "📸",
            NotificationType.PAYOUT_REQUESTED: "📤",
            NotificationType.PAYOUT_PROCESSED: "💸",
            NotificationType.PAYOUT_REJECTED: "❌"
        }.get(notification.type, "📧")
        
        print(f"\n{emoji} NOTIFICATION [{notification.recipient_role.upper()}]")
        print(f"   To: {notification.recipient_id}")
        print(f"   Title: {notification.title}")
        print(f"   Message: {notification.message}")
        if notification.amount:
            print(f"   Amount: Rs. {notification.amount:,.0f}")
        print(f"   Time: {notification.created_at.strftime('%Y-%m-%d %H:%M:%S')}")

    def send(self, notification: Notification) -> Notification:
        """Store and log notification"""
        self.notifications.append(notification)
        self._log_notification(notification)
        return notification

    def _create_notification(
        self,
        user_id: str,
        notification_type: NotificationType,
        title: str,
        message: str,
        data: dict = None,
        amount: float = None
    ) -> Notification:
        """Helper to create a notification object"""
        return Notification(
            notification_type=notification_type,
            recipient_id=user_id,
            recipient_role="user",
            title=title,
            message=message,
            metadata=data or {},
            amount=amount
        )

    def get_user_notifications(self, user_id: str, unread_only: bool = False) -> List[Dict]:
        """Get all notifications for a user"""
        user_notifs = [n for n in self.notifications if n.recipient_id == user_id]
        if unread_only:
            user_notifs = [n for n in user_notifs if not n.read]
        return [n.to_dict() for n in sorted(user_notifs, key=lambda x: x.created_at, reverse=True)]

    def mark_read(self, notification_id: str) -> bool:
        """Mark notification as read"""
        for n in self.notifications:
            if n.id == notification_id:
                n.read = True
                return True
        return False

    def mark_all_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user"""
        count = 0
        for n in self.notifications:
            if n.recipient_id == user_id and not n.read:
                n.read = True
                count += 1
        return count

    def get_unread_count(self, user_id: str) -> int:
        """Count unread notifications for user"""
        return len([n for n in self.notifications if n.recipient_id == user_id and not n.read])

    # ============================================
    # Payment Notification Helpers
    # ============================================

    def notify_payment_received(
        self,
        client_id: str,
        photographer_id: str,
        booking_id: str,
        amount: float,
        photographer_name: str,
        is_advance: bool = True
    ):
        """Notify both parties when payment is received"""
        payment_type = "50% advance" if is_advance else "remaining 50%"
        
        # Notify client
        self.send(Notification(
            notification_type=NotificationType.PAYMENT_RECEIVED,
            recipient_id=client_id,
            recipient_role="client",
            title="Payment Successful ✅",
            message=f"Your {payment_type} payment of Rs. {amount:,.0f} for booking with {photographer_name} has been received and secured.",
            booking_id=booking_id,
            amount=amount
        ))
        
        # Notify photographer
        self.send(Notification(
            notification_type=NotificationType.PAYMENT_RECEIVED,
            recipient_id=photographer_id,
            recipient_role="photographer",
            title=f"{'New Booking' if is_advance else 'Final'} Payment Received! 💵",
            message=f"Client paid {payment_type} (Rs. {amount:,.0f}) for your services. {'Complete the work to unlock full payment.' if is_advance else 'Full payment received!'}",
            booking_id=booking_id,
            amount=amount
        ))

    def notify_payment_held(
        self,
        client_id: str,
        photographer_id: str,
        booking_id: str,
        amount: float
    ):
        """Notify when payment is held in escrow"""
        # Notify client
        self.send(Notification(
            notification_type=NotificationType.PAYMENT_HELD,
            recipient_id=client_id,
            recipient_role="client",
            title="Payment Secured",
            message=f"Your payment of Rs. {amount:,.0f} is now held securely. It will be released to the photographer after you confirm work completion.",
            booking_id=booking_id,
            amount=amount
        ))

    def notify_payment_released(
        self,
        client_id: str,
        photographer_id: str,
        booking_id: str,
        total_amount: float,
        photographer_amount: float,
        platform_fee: float
    ):
        """Notify when payment is released to photographer"""
        # Notify client
        self.send(Notification(
            notification_type=NotificationType.PAYMENT_RELEASED,
            recipient_id=client_id,
            recipient_role="client",
            title="Payment Released",
            message=f"You have confirmed the work completion. Rs. {total_amount:,.0f} has been released to the photographer. Thank you for using BookYourShoot!",
            booking_id=booking_id,
            amount=total_amount
        ))
        
        # Notify photographer
        self.send(Notification(
            notification_type=NotificationType.PAYMENT_RELEASED,
            recipient_id=photographer_id,
            recipient_role="photographer",
            title="Payment Received! 🎉",
            message=f"Great news! Rs. {photographer_amount:,.0f} has been released to your account (after Rs. {platform_fee:,.0f} platform fee).",
            booking_id=booking_id,
            amount=photographer_amount,
            metadata={"platform_fee": platform_fee, "gross_amount": total_amount}
        ))

    def notify_payment_refunded(
        self,
        client_id: str,
        photographer_id: str,
        booking_id: str,
        refund_amount: float,
        photographer_compensation: float,
        policy: str
    ):
        """Notify both parties about refund"""
        # Notify client
        self.send(Notification(
            notification_type=NotificationType.PAYMENT_REFUNDED,
            recipient_id=client_id,
            recipient_role="client",
            title="Refund Processed",
            message=f"Your booking has been cancelled. Rs. {refund_amount:,.0f} will be refunded to your original payment method. ({policy})",
            booking_id=booking_id,
            amount=refund_amount,
            metadata={"policy": policy}
        ))
        
        # Notify photographer
        if photographer_compensation > 0:
            self.send(Notification(
                notification_type=NotificationType.PAYMENT_REFUNDED,
                recipient_id=photographer_id,
                recipient_role="photographer",
                title="Booking Cancelled - Compensation Received",
                message=f"A booking was cancelled. You will receive Rs. {photographer_compensation:,.0f} as compensation for the late cancellation.",
                booking_id=booking_id,
                amount=photographer_compensation,
                metadata={"policy": policy}
            ))
        else:
            self.send(Notification(
                notification_type=NotificationType.BOOKING_CANCELLED,
                recipient_id=photographer_id,
                recipient_role="photographer",
                title="Booking Cancelled",
                message=f"A client has cancelled their booking. The client received a full refund as they cancelled with sufficient notice.",
                booking_id=booking_id
            ))

    def notify_dispute_opened(
        self,
        client_id: str,
        photographer_id: str,
        booking_id: str,
        reason: str
    ):
        """Notify about dispute"""
        # Notify admin (mock admin ID)
        self.send(Notification(
            notification_type=NotificationType.DISPUTE_OPENED,
            recipient_id="admin",
            recipient_role="admin",
            title="New Dispute Opened",
            message=f"A dispute has been opened for booking {booking_id}. Reason: {reason}",
            booking_id=booking_id,
            metadata={"reason": reason, "client_id": client_id, "photographer_id": photographer_id}
        ))
        
        # Notify both parties
        self.send(Notification(
            notification_type=NotificationType.DISPUTE_OPENED,
            recipient_id=client_id,
            recipient_role="client",
            title="Dispute Submitted",
            message="Your dispute has been submitted. Our team will review it within 24-48 hours.",
            booking_id=booking_id
        ))
        
        self.send(Notification(
            notification_type=NotificationType.DISPUTE_OPENED,
            recipient_id=photographer_id,
            recipient_role="photographer",
            title="Dispute Opened on Your Booking",
            message="A client has opened a dispute on one of your bookings. Please check your dashboard for details.",
            booking_id=booking_id
        ))

    def notify_booking_confirmed(
        self,
        client_id: str,
        photographer_id: str,
        booking_id: str,
        photographer_name: str,
        service_type: str,
        date: str
    ):
        """Notify both parties when a booking is confirmed"""
        # Notify client
        self.send(Notification(
            notification_type=NotificationType.BOOKING_CONFIRMED,
            recipient_id=client_id,
            recipient_role="client",
            title="Booking Confirmed! ✅",
            message=f"Your {service_type} session with {photographer_name} on {date} is confirmed. 50% advance payment has been secured.",
            booking_id=booking_id,
            metadata={"photographer_name": photographer_name, "service_type": service_type, "date": date}
        ))
        
        # Notify photographer
        self.send(Notification(
            notification_type=NotificationType.BOOKING_CONFIRMED,
            recipient_id=photographer_id,
            recipient_role="photographer",
            title="New Booking Confirmed! 🎉",
            message=f"You have a new {service_type} booking on {date}. Client paid 50% advance - payment is secured in escrow.",
            booking_id=booking_id,
            metadata={"service_type": service_type, "date": date}
        ))

    # ============================================
    # 50/50 Payment Flow Notifications
    # ============================================

    def notify_advance_payment_received(
        self,
        client_id: str,
        photographer_id: str,
        booking_id: str,
        advance_amount: float,
        remaining_amount: float,
        photographer_name: str,
        service_type: str,
        date: str
    ):
        """Notify when 50% advance payment is received"""
        # Notify client
        self.send(Notification(
            notification_type=NotificationType.ADVANCE_PAYMENT_RECEIVED,
            recipient_id=client_id,
            recipient_role="client",
            title="50% Advance Payment Received ✅",
            message=f"Your advance payment of Rs. {advance_amount:,.0f} for {service_type} with {photographer_name} is confirmed. Remaining Rs. {remaining_amount:,.0f} due after session.",
            booking_id=booking_id,
            amount=advance_amount,
            metadata={"remaining_amount": remaining_amount, "photographer_name": photographer_name}
        ))
        
        # Notify photographer
        self.send(Notification(
            notification_type=NotificationType.ADVANCE_PAYMENT_RECEIVED,
            recipient_id=photographer_id,
            recipient_role="photographer",
            title="New Booking - 50% Advance Received! 💵",
            message=f"Client paid Rs. {advance_amount:,.0f} advance for {service_type} on {date}. Complete the work to receive full payment.",
            booking_id=booking_id,
            amount=advance_amount,
            metadata={"remaining_amount": remaining_amount, "date": date}
        ))

    def notify_work_completed(
        self,
        client_id: str,
        photographer_id: str,
        booking_id: str,
        remaining_amount: float,
        photographer_name: str,
        service_type: str,
        photos_count: int = 0
    ):
        """Notify when photographer marks work as complete"""
        # Notify client - action required
        self.send(Notification(
            notification_type=NotificationType.WORK_COMPLETED,
            recipient_id=client_id,
            recipient_role="client",
            title="📸 Your Photos Are Ready!",
            message=f"{photographer_name} has completed your {service_type} session! Please pay remaining Rs. {remaining_amount:,.0f} to access your photos.",
            booking_id=booking_id,
            amount=remaining_amount,
            metadata={"photographer_name": photographer_name, "photos_count": photos_count, "action_required": True}
        ))
        
        # Notify photographer
        self.send(Notification(
            notification_type=NotificationType.WORK_COMPLETED,
            recipient_id=photographer_id,
            recipient_role="photographer",
            title="Work Marked Complete ✅",
            message=f"You've marked the {service_type} booking as complete. Client has been notified to pay remaining Rs. {remaining_amount:,.0f}.",
            booking_id=booking_id,
            amount=remaining_amount
        ))

    def notify_remaining_payment_due(
        self,
        client_id: str,
        booking_id: str,
        remaining_amount: float,
        photographer_name: str,
        service_type: str
    ):
        """Remind client about remaining payment"""
        self.send(Notification(
            notification_type=NotificationType.REMAINING_PAYMENT_DUE,
            recipient_id=client_id,
            recipient_role="client",
            title="⏰ Remaining Payment Due",
            message=f"Please pay remaining Rs. {remaining_amount:,.0f} for your {service_type} with {photographer_name} to complete the booking.",
            booking_id=booking_id,
            amount=remaining_amount,
            metadata={"action_required": True}
        ))

    def notify_remaining_payment_received(
        self,
        client_id: str,
        photographer_id: str,
        booking_id: str,
        remaining_amount: float,
        total_amount: float,
        photographer_earnings: float,
        platform_fee: float
    ):
        """Notify when final 50% payment is received"""
        # Notify client
        self.send(Notification(
            notification_type=NotificationType.REMAINING_PAYMENT_RECEIVED,
            recipient_id=client_id,
            recipient_role="client",
            title="Final Payment Complete! 🎉",
            message=f"Thank you! Your final payment of Rs. {remaining_amount:,.0f} has been received. Total paid: Rs. {total_amount:,.0f}. Don't forget to leave a review!",
            booking_id=booking_id,
            amount=total_amount
        ))
        
        # Notify photographer
        self.send(Notification(
            notification_type=NotificationType.PAYMENT_RELEASED,
            recipient_id=photographer_id,
            recipient_role="photographer",
            title="Full Payment Received! 💰",
            message=f"Client completed final payment! You'll receive Rs. {photographer_earnings:,.0f} (after Rs. {platform_fee:,.0f} platform fee). Funds available for payout after 7-day escrow.",
            booking_id=booking_id,
            amount=photographer_earnings,
            metadata={"platform_fee": platform_fee, "gross_amount": total_amount}
        ))

    def notify_payout_requested(
        self,
        photographer_id: str,
        payout_id: str,
        amount: float,
        bank_name: str
    ):
        """Notify when photographer requests a payout"""
        # Notify photographer
        self.send(Notification(
            notification_type=NotificationType.PAYOUT_REQUESTED,
            recipient_id=photographer_id,
            recipient_role="photographer",
            title="Payout Requested 📤",
            message=f"Your payout request for Rs. {amount:,.0f} to {bank_name} has been submitted. Processing takes 2-3 business days.",
            amount=amount,
            metadata={"payout_id": payout_id, "bank_name": bank_name}
        ))
        
        # Notify admin
        self.send(Notification(
            notification_type=NotificationType.PAYOUT_REQUESTED,
            recipient_id="admin",
            recipient_role="admin",
            title="New Payout Request",
            message=f"Photographer requested payout of Rs. {amount:,.0f} to {bank_name}. Payout ID: {payout_id}",
            amount=amount,
            metadata={"payout_id": payout_id, "photographer_id": photographer_id}
        ))

    def notify_payout_processed(
        self,
        photographer_id: str,
        payout_id: str,
        amount: float,
        bank_name: str
    ):
        """Notify when payout is processed"""
        self.send(Notification(
            notification_type=NotificationType.PAYOUT_PROCESSED,
            recipient_id=photographer_id,
            recipient_role="photographer",
            title="Payout Processed! 💸",
            message=f"Your payout of Rs. {amount:,.0f} has been sent to {bank_name}. Funds should arrive within 2-3 business days.",
            amount=amount,
            metadata={"payout_id": payout_id, "bank_name": bank_name}
        ))

    def notify_payout_rejected(
        self,
        photographer_id: str,
        payout_id: str,
        amount: float,
        reason: str
    ):
        """Notify when payout is rejected"""
        self.send(Notification(
            notification_type=NotificationType.PAYOUT_REJECTED,
            recipient_id=photographer_id,
            recipient_role="photographer",
            title="Payout Rejected ❌",
            message=f"Your payout request for Rs. {amount:,.0f} was rejected. Reason: {reason}. Please contact support.",
            amount=amount,
            metadata={"payout_id": payout_id, "reason": reason}
        ))

    def notify_dispute_resolved(
        self,
        client_id: str,
        photographer_id: str,
        booking_id: str,
        resolution: str,
        client_amount: float,
        photographer_amount: float
    ):
        """Notify about dispute resolution"""
        self.send(Notification(
            notification_type=NotificationType.DISPUTE_RESOLVED,
            recipient_id=client_id,
            recipient_role="client",
            title="Dispute Resolved",
            message=f"Your dispute has been resolved. {resolution}. You will receive Rs. {client_amount:,.0f}.",
            booking_id=booking_id,
            amount=client_amount
        ))
        
        self.send(Notification(
            notification_type=NotificationType.DISPUTE_RESOLVED,
            recipient_id=photographer_id,
            recipient_role="photographer",
            title="Dispute Resolved",
            message=f"The dispute has been resolved. {resolution}. You will receive Rs. {photographer_amount:,.0f}.",
            booking_id=booking_id,
            amount=photographer_amount
        ))

    def get_all_notifications(self) -> List[Dict]:
        """Admin: Get all notifications (for debugging)"""
        return [n.to_dict() for n in sorted(self.notifications, key=lambda x: x.created_at, reverse=True)]


# Singleton instance
notification_service = NotificationService()
