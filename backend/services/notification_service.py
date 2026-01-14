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
            NotificationType.DISPUTE_RESOLVED: "✔️"
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
        photographer_name: str
    ):
        """Notify both parties when payment is received"""
        # Notify client
        self.send(Notification(
            notification_type=NotificationType.PAYMENT_RECEIVED,
            recipient_id=client_id,
            recipient_role="client",
            title="Payment Successful",
            message=f"Your payment of Rs. {amount:,.0f} for booking with {photographer_name} has been received. The payment is now secured until work is completed.",
            booking_id=booking_id,
            amount=amount
        ))
        
        # Notify photographer
        self.send(Notification(
            notification_type=NotificationType.PAYMENT_RECEIVED,
            recipient_id=photographer_id,
            recipient_role="photographer",
            title="New Booking Payment Received",
            message=f"A client has paid Rs. {amount:,.0f} for your services. The payment is held securely until you complete the work.",
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
            message=f"Your {service_type} session with {photographer_name} on {date} is confirmed. Payment has been secured.",
            booking_id=booking_id,
            metadata={"photographer_name": photographer_name, "service_type": service_type, "date": date}
        ))
        
        # Notify photographer
        self.send(Notification(
            notification_type=NotificationType.BOOKING_CONFIRMED,
            recipient_id=photographer_id,
            recipient_role="photographer",
            title="New Booking Confirmed! 🎉",
            message=f"You have a new {service_type} booking on {date}. Payment is secured and awaiting your work completion.",
            booking_id=booking_id,
            metadata={"service_type": service_type, "date": date}
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
