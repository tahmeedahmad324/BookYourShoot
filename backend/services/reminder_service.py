"""
Booking Reminder Service - Sends reminders for upcoming shoots
Automatically notifies clients and photographers before their scheduled bookings

Reminder Schedule:
- 24 hours before: Both client and photographer get reminded
- 2 hours before: Final reminder to both parties
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from enum import Enum
import threading
import time

# Import notification service for sending reminders
try:
    from .notification_service import notification_service, NotificationType
except ImportError:
    from notification_service import notification_service, NotificationType


class ReminderType(Enum):
    BOOKING_24H = "booking_24h"  # 24 hours before
    BOOKING_2H = "booking_2h"    # 2 hours before
    BOOKING_CONFIRMED = "booking_confirmed"
    BOOKING_CANCELLED = "booking_cancelled"
    WORK_COMPLETE_REMINDER = "work_complete_reminder"  # Remind client to confirm work


class BookingReminder:
    """Represents a scheduled reminder"""
    def __init__(
        self,
        booking_id: str,
        client_id: str,
        photographer_id: str,
        reminder_type: ReminderType,
        scheduled_time: datetime,
        booking_date: str,
        service_type: str,
        client_name: str = "Client",
        photographer_name: str = "Photographer"
    ):
        self.id = f"REM-{booking_id}-{reminder_type.value}"
        self.booking_id = booking_id
        self.client_id = client_id
        self.photographer_id = photographer_id
        self.reminder_type = reminder_type
        self.scheduled_time = scheduled_time
        self.booking_date = booking_date
        self.service_type = service_type
        self.client_name = client_name
        self.photographer_name = photographer_name
        self.sent = False
        self.sent_at = None
        self.created_at = datetime.now()

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "client_id": self.client_id,
            "photographer_id": self.photographer_id,
            "reminder_type": self.reminder_type.value,
            "scheduled_time": self.scheduled_time.isoformat(),
            "booking_date": self.booking_date,
            "service_type": self.service_type,
            "sent": self.sent,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "created_at": self.created_at.isoformat()
        }


class BookingReminderService:
    """
    Service to manage booking reminders
    In production, this would use a proper job scheduler (Celery, APScheduler, etc.)
    For demo purposes, we use in-memory storage and manual triggering
    """
    
    def __init__(self):
        self._reminders: Dict[str, BookingReminder] = {}
        self._sent_reminders: List[BookingReminder] = []
        
    def schedule_reminders_for_booking(
        self,
        booking_id: str,
        booking_datetime: str,
        client_id: str,
        photographer_id: str,
        service_type: str,
        client_name: str = "Client",
        photographer_name: str = "Photographer"
    ) -> List[Dict]:
        """
        Schedule all reminders for a booking
        Called when a booking is confirmed
        """
        booking_date = datetime.fromisoformat(booking_datetime.replace('Z', '+00:00'))
        scheduled = []
        
        # 24-hour reminder
        reminder_24h_time = booking_date - timedelta(hours=24)
        if reminder_24h_time > datetime.now(booking_date.tzinfo) if booking_date.tzinfo else datetime.now():
            reminder_24h = BookingReminder(
                booking_id=booking_id,
                client_id=client_id,
                photographer_id=photographer_id,
                reminder_type=ReminderType.BOOKING_24H,
                scheduled_time=reminder_24h_time,
                booking_date=booking_datetime,
                service_type=service_type,
                client_name=client_name,
                photographer_name=photographer_name
            )
            self._reminders[reminder_24h.id] = reminder_24h
            scheduled.append(reminder_24h.to_dict())
            print(f"📅 Scheduled 24h reminder for booking {booking_id}")
        
        # 2-hour reminder
        reminder_2h_time = booking_date - timedelta(hours=2)
        if reminder_2h_time > datetime.now(booking_date.tzinfo) if booking_date.tzinfo else datetime.now():
            reminder_2h = BookingReminder(
                booking_id=booking_id,
                client_id=client_id,
                photographer_id=photographer_id,
                reminder_type=ReminderType.BOOKING_2H,
                scheduled_time=reminder_2h_time,
                booking_date=booking_datetime,
                service_type=service_type,
                client_name=client_name,
                photographer_name=photographer_name
            )
            self._reminders[reminder_2h.id] = reminder_2h
            scheduled.append(reminder_2h.to_dict())
            print(f"📅 Scheduled 2h reminder for booking {booking_id}")
        
        return scheduled
    
    def schedule_work_complete_reminder(
        self,
        booking_id: str,
        client_id: str,
        photographer_id: str,
        photographer_name: str,
        service_type: str,
        delay_hours: int = 48
    ) -> Dict:
        """
        Schedule a reminder for client to confirm work completion
        Called after photographer marks work as delivered
        """
        reminder_time = datetime.now() + timedelta(hours=delay_hours)
        
        reminder = BookingReminder(
            booking_id=booking_id,
            client_id=client_id,
            photographer_id=photographer_id,
            reminder_type=ReminderType.WORK_COMPLETE_REMINDER,
            scheduled_time=reminder_time,
            booking_date=datetime.now().isoformat(),
            service_type=service_type,
            photographer_name=photographer_name
        )
        self._reminders[reminder.id] = reminder
        print(f"📅 Scheduled work completion reminder for booking {booking_id}")
        return reminder.to_dict()
    
    def send_reminder(self, reminder: BookingReminder) -> bool:
        """Send a specific reminder via notification service"""
        try:
            if reminder.reminder_type == ReminderType.BOOKING_24H:
                # Notify client
                notification_service.send(notification_service._create_notification(
                    user_id=reminder.client_id,
                    notification_type=NotificationType.BOOKING_REMINDER,
                    title="📸 Shoot Tomorrow!",
                    message=f"Your {reminder.service_type} session with {reminder.photographer_name} is tomorrow! Make sure you're prepared.",
                    data={
                        "booking_id": reminder.booking_id,
                        "booking_date": reminder.booking_date,
                        "photographer_name": reminder.photographer_name
                    }
                ))
                # Notify photographer
                notification_service.send(notification_service._create_notification(
                    user_id=reminder.photographer_id,
                    notification_type=NotificationType.BOOKING_REMINDER,
                    title="📸 Shoot Tomorrow!",
                    message=f"You have a {reminder.service_type} session with {reminder.client_name} tomorrow! Get your equipment ready.",
                    data={
                        "booking_id": reminder.booking_id,
                        "booking_date": reminder.booking_date,
                        "client_name": reminder.client_name
                    }
                ))
                
            elif reminder.reminder_type == ReminderType.BOOKING_2H:
                # Notify client
                notification_service.send(notification_service._create_notification(
                    user_id=reminder.client_id,
                    notification_type=NotificationType.BOOKING_REMINDER,
                    title="⏰ Shoot Starting Soon!",
                    message=f"Your session with {reminder.photographer_name} starts in 2 hours!",
                    data={
                        "booking_id": reminder.booking_id,
                        "booking_date": reminder.booking_date
                    }
                ))
                # Notify photographer
                notification_service.send(notification_service._create_notification(
                    user_id=reminder.photographer_id,
                    notification_type=NotificationType.BOOKING_REMINDER,
                    title="⏰ Shoot Starting Soon!",
                    message=f"Your session with {reminder.client_name} starts in 2 hours!",
                    data={
                        "booking_id": reminder.booking_id,
                        "booking_date": reminder.booking_date
                    }
                ))
                
            elif reminder.reminder_type == ReminderType.WORK_COMPLETE_REMINDER:
                # Only notify client to confirm work
                notification_service.send(notification_service._create_notification(
                    user_id=reminder.client_id,
                    notification_type=NotificationType.BOOKING_REMINDER,
                    title="✅ Please Review Your Photos",
                    message=f"{reminder.photographer_name} has delivered your photos. Please review and confirm to release payment.",
                    data={
                        "booking_id": reminder.booking_id,
                        "action": "confirm_work"
                    }
                ))
            
            reminder.sent = True
            reminder.sent_at = datetime.now()
            self._sent_reminders.append(reminder)
            del self._reminders[reminder.id]
            print(f"✅ Sent {reminder.reminder_type.value} reminder for booking {reminder.booking_id}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to send reminder: {e}")
            return False
    
    def check_and_send_due_reminders(self) -> List[Dict]:
        """
        Check for reminders that are due and send them
        In production, this would be called by a scheduled job
        For demo, call this manually or via an API endpoint
        """
        now = datetime.now()
        sent = []
        
        for reminder_id, reminder in list(self._reminders.items()):
            # Check if reminder is due (scheduled time has passed)
            scheduled = reminder.scheduled_time
            if scheduled.tzinfo:
                now_tz = now.replace(tzinfo=scheduled.tzinfo)
            else:
                now_tz = now
                
            if scheduled <= now_tz and not reminder.sent:
                if self.send_reminder(reminder):
                    sent.append(reminder.to_dict())
        
        return sent
    
    def cancel_reminders_for_booking(self, booking_id: str) -> int:
        """Cancel all pending reminders for a booking (e.g., when booking is cancelled)"""
        cancelled = 0
        for reminder_id in list(self._reminders.keys()):
            if booking_id in reminder_id:
                del self._reminders[reminder_id]
                cancelled += 1
                print(f"🗑️ Cancelled reminder {reminder_id}")
        return cancelled
    
    def get_pending_reminders(self, booking_id: str = None) -> List[Dict]:
        """Get all pending reminders, optionally filtered by booking"""
        reminders = list(self._reminders.values())
        if booking_id:
            reminders = [r for r in reminders if r.booking_id == booking_id]
        return [r.to_dict() for r in reminders]
    
    def get_sent_reminders(self, user_id: str = None) -> List[Dict]:
        """Get all sent reminders, optionally filtered by user"""
        reminders = self._sent_reminders
        if user_id:
            reminders = [r for r in reminders if r.client_id == user_id or r.photographer_id == user_id]
        return [r.to_dict() for r in reminders]
    
    # Demo helper: Simulate sending a reminder immediately
    def send_demo_reminder(
        self,
        booking_id: str,
        client_id: str,
        photographer_id: str,
        service_type: str = "Photography Session",
        reminder_type: str = "24h"
    ) -> Dict:
        """Send a demo reminder immediately for testing"""
        reminder = BookingReminder(
            booking_id=booking_id,
            client_id=client_id,
            photographer_id=photographer_id,
            reminder_type=ReminderType.BOOKING_24H if reminder_type == "24h" else ReminderType.BOOKING_2H,
            scheduled_time=datetime.now(),
            booking_date=(datetime.now() + timedelta(days=1)).isoformat(),
            service_type=service_type,
            client_name="Demo Client",
            photographer_name="Demo Photographer"
        )
        
        if self.send_reminder(reminder):
            return {"success": True, "reminder": reminder.to_dict()}
        return {"success": False, "error": "Failed to send reminder"}


# Global instance
reminder_service = BookingReminderService()
