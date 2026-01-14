"""
Dispute Escalation Service - Automatically escalates unresolved disputes
Monitors disputes and notifies admin when they remain unresolved for too long

Escalation Rules:
- 24 hours: Mark as "needs attention"
- 48 hours: Escalate to admin with high priority
- 72 hours: Critical escalation - send urgent notification
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from enum import Enum

try:
    from .notification_service import notification_service, NotificationType, Notification
except ImportError:
    from notification_service import notification_service, NotificationType, Notification


class EscalationLevel(Enum):
    NORMAL = "normal"           # 0-24 hours
    ATTENTION = "attention"     # 24-48 hours
    HIGH_PRIORITY = "high"      # 48-72 hours
    CRITICAL = "critical"       # 72+ hours


class EscalationEvent:
    """Represents an escalation event for a dispute"""
    def __init__(
        self,
        dispute_id: str,
        level: EscalationLevel,
        message: str,
        notified_at: datetime = None
    ):
        self.id = f"ESC-{dispute_id}-{level.value}"
        self.dispute_id = dispute_id
        self.level = level
        self.message = message
        self.notified_at = notified_at or datetime.now()

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "dispute_id": self.dispute_id,
            "level": self.level.value,
            "message": self.message,
            "notified_at": self.notified_at.isoformat()
        }


class DisputeEscalationService:
    """
    Monitors disputes and automatically escalates unresolved ones
    In production, this would be a background job running periodically
    """
    
    # Time thresholds for escalation (in hours)
    ATTENTION_THRESHOLD = 24
    HIGH_PRIORITY_THRESHOLD = 48
    CRITICAL_THRESHOLD = 72
    
    def __init__(self):
        self._escalation_history: Dict[str, List[EscalationEvent]] = {}
        self._admin_ids = ["admin@bookyourshoot.com", "support@bookyourshoot.com"]
        print("⚠️ Dispute escalation service initialized")

    def calculate_escalation_level(self, dispute: Dict) -> EscalationLevel:
        """Calculate current escalation level based on dispute age"""
        created_at = dispute.get("created_at")
        if not created_at:
            return EscalationLevel.NORMAL
        
        if isinstance(created_at, str):
            created = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        else:
            created = created_at
        
        # Calculate hours since dispute was created
        now = datetime.now(created.tzinfo) if created.tzinfo else datetime.now()
        hours_open = (now - created).total_seconds() / 3600
        
        if hours_open >= self.CRITICAL_THRESHOLD:
            return EscalationLevel.CRITICAL
        elif hours_open >= self.HIGH_PRIORITY_THRESHOLD:
            return EscalationLevel.HIGH_PRIORITY
        elif hours_open >= self.ATTENTION_THRESHOLD:
            return EscalationLevel.ATTENTION
        else:
            return EscalationLevel.NORMAL

    def check_dispute_escalation(self, dispute: Dict) -> Optional[EscalationEvent]:
        """
        Check if a dispute needs escalation and send notification if needed
        Returns the escalation event if one was created, None otherwise
        """
        dispute_id = dispute.get("id")
        status = dispute.get("status", "")
        
        # Only escalate open disputes
        if status not in ["open", "under_review"]:
            return None
        
        current_level = self.calculate_escalation_level(dispute)
        
        # Check if we've already notified at this level
        history = self._escalation_history.get(dispute_id, [])
        already_notified = any(e.level == current_level for e in history)
        
        if already_notified or current_level == EscalationLevel.NORMAL:
            return None
        
        # Create escalation event
        event = self._create_escalation_event(dispute, current_level)
        
        # Store in history
        if dispute_id not in self._escalation_history:
            self._escalation_history[dispute_id] = []
        self._escalation_history[dispute_id].append(event)
        
        # Send admin notification
        self._notify_admins(dispute, event)
        
        return event

    def _create_escalation_event(self, dispute: Dict, level: EscalationLevel) -> EscalationEvent:
        """Create an escalation event with appropriate message"""
        dispute_id = dispute.get("id")
        booking_id = dispute.get("booking_id", "Unknown")
        
        messages = {
            EscalationLevel.ATTENTION: f"Dispute {dispute_id} has been open for 24+ hours and needs attention",
            EscalationLevel.HIGH_PRIORITY: f"⚠️ ESCALATION: Dispute {dispute_id} unresolved for 48+ hours - High Priority",
            EscalationLevel.CRITICAL: f"🚨 CRITICAL: Dispute {dispute_id} unresolved for 72+ hours - Immediate action required"
        }
        
        return EscalationEvent(
            dispute_id=dispute_id,
            level=level,
            message=messages.get(level, f"Dispute {dispute_id} requires attention")
        )

    def _notify_admins(self, dispute: Dict, event: EscalationEvent):
        """Send notification to all admins about escalation"""
        dispute_id = dispute.get("id")
        booking_id = dispute.get("booking_id", "Unknown")
        client_id = dispute.get("client_id", "Unknown")
        photographer_id = dispute.get("photographer_id", "Unknown")
        
        # Determine notification urgency based on level
        urgency_emoji = {
            EscalationLevel.ATTENTION: "📋",
            EscalationLevel.HIGH_PRIORITY: "⚠️",
            EscalationLevel.CRITICAL: "🚨"
        }
        
        titles = {
            EscalationLevel.ATTENTION: "Dispute Needs Attention",
            EscalationLevel.HIGH_PRIORITY: "HIGH PRIORITY Dispute",
            EscalationLevel.CRITICAL: "CRITICAL - Dispute Unresolved"
        }
        
        # Notify all admins
        for admin_id in self._admin_ids:
            notification = Notification(
                recipient_id=admin_id,
                recipient_role="admin",
                type=NotificationType.DISPUTE_OPENED,  # Reusing existing type
                title=f"{urgency_emoji.get(event.level, '📋')} {titles.get(event.level, 'Dispute Alert')}",
                message=event.message,
                data={
                    "dispute_id": dispute_id,
                    "booking_id": booking_id,
                    "client_id": client_id,
                    "photographer_id": photographer_id,
                    "escalation_level": event.level.value,
                    "action_required": True
                }
            )
            notification_service.send(notification)
        
        print(f"🔔 Escalation notification sent to {len(self._admin_ids)} admin(s)")

    def check_all_disputes(self, disputes: List[Dict]) -> List[EscalationEvent]:
        """
        Check all disputes for escalation
        Called periodically by scheduler or manually for demo
        """
        escalations = []
        
        for dispute in disputes:
            event = self.check_dispute_escalation(dispute)
            if event:
                escalations.append(event)
        
        if escalations:
            print(f"⚠️ {len(escalations)} dispute(s) escalated")
        
        return escalations

    def get_escalation_history(self, dispute_id: str = None) -> List[Dict]:
        """Get escalation history for a dispute or all disputes"""
        if dispute_id:
            events = self._escalation_history.get(dispute_id, [])
            return [e.to_dict() for e in events]
        
        all_events = []
        for events in self._escalation_history.values():
            all_events.extend([e.to_dict() for e in events])
        return sorted(all_events, key=lambda x: x["notified_at"], reverse=True)

    def get_escalated_disputes(self, disputes: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Get disputes grouped by escalation level
        Useful for admin dashboard to prioritize
        """
        result = {
            "critical": [],
            "high": [],
            "attention": [],
            "normal": []
        }
        
        for dispute in disputes:
            if dispute.get("status") not in ["open", "under_review"]:
                continue
            
            level = self.calculate_escalation_level(dispute)
            dispute_with_level = {**dispute, "escalation_level": level.value}
            result[level.value].append(dispute_with_level)
        
        return result

    # Demo helper
    def simulate_escalation(
        self,
        dispute_id: str,
        level: str = "high"
    ) -> EscalationEvent:
        """Simulate an escalation for demo purposes"""
        level_map = {
            "attention": EscalationLevel.ATTENTION,
            "high": EscalationLevel.HIGH_PRIORITY,
            "critical": EscalationLevel.CRITICAL
        }
        
        escalation_level = level_map.get(level, EscalationLevel.HIGH_PRIORITY)
        
        demo_dispute = {
            "id": dispute_id,
            "booking_id": f"BK-{dispute_id}",
            "client_id": "demo-client@example.com",
            "photographer_id": "demo-photographer@example.com",
            "status": "open",
            "created_at": (datetime.now() - timedelta(hours=50)).isoformat()
        }
        
        event = self._create_escalation_event(demo_dispute, escalation_level)
        
        if dispute_id not in self._escalation_history:
            self._escalation_history[dispute_id] = []
        self._escalation_history[dispute_id].append(event)
        
        self._notify_admins(demo_dispute, event)
        
        return event


# Global instance
escalation_service = DisputeEscalationService()
