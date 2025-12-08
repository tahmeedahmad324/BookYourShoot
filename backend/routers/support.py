from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from backend.supabase_client import supabase
from backend.auth import get_current_user

router = APIRouter(prefix="/support", tags=["Support"])


class CreateTicketRequest(BaseModel):
    category: str  # account, booking, payment, technical, other
    subject: str
    message: str
    priority: str = "medium"  # low, medium, high, urgent


class ReplyToTicketRequest(BaseModel):
    message: str
    is_admin_reply: bool = False


@router.post("/tickets")
def create_support_ticket(payload: CreateTicketRequest, current_user: dict = Depends(get_current_user)):
    """Create a new support ticket"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        ticket = {
            "user_id": user_id,
            "category": payload.category,
            "subject": payload.subject,
            "priority": payload.priority,
            "status": "open"
        }

        resp = supabase.table('support_tickets').insert(ticket).execute()
        ticket_id = resp.data[0]['id']
        
        # Create first message
        message = {
            "ticket_id": ticket_id,
            "user_id": user_id,
            "message": payload.message,
            "is_admin_reply": False
        }
        
        supabase.table('support_messages').insert(message).execute()
        
        return {"success": True, "data": resp.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tickets/my")
def get_my_tickets(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all support tickets for current user"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        query = supabase.table('support_tickets').select('*').eq('user_id', user_id)
        
        if status:
            query = query.eq('status', status)
        
        resp = query.order('created_at', desc=True).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/tickets")
def get_all_tickets(status: Optional[str] = None, category: Optional[str] = None, priority: Optional[str] = None, limit: int = 50, offset: int = 0, current_user: dict = Depends(get_current_user)):
    """Get all support tickets (admin only)"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Verify admin
        user = supabase.table('users').select('role').eq('id', user_id).limit(1).execute()
        if not user.data or user.data[0].get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")

        query = supabase.table('support_tickets').select('*, user:users(full_name, email)')
        
        if status:
            query = query.eq('status', status)
        if category:
            query = query.eq('category', category)
        if priority:
            query = query.eq('priority', priority)
        
        resp = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/tickets/{ticket_id}")
def get_ticket_details(ticket_id: str, current_user: dict = Depends(get_current_user)):
    """Get ticket details with all messages"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Get ticket
        ticket = supabase.table('support_tickets').select('*, user:users(*)').eq('id', ticket_id).limit(1).execute()
        
        if not ticket.data:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Check access
        user = supabase.table('users').select('role').eq('id', user_id).limit(1).execute()
        is_admin = user.data and user.data[0].get('role') == 'admin'
        
        if ticket.data[0]['user_id'] != user_id and not is_admin:
            raise HTTPException(status_code=403, detail="Unauthorized to view this ticket")
        
        # Get messages
        messages = supabase.table('support_messages').select('*, user:users(full_name, email)').eq('ticket_id', ticket_id).order('created_at', desc=False).execute()
        
        return {
            "success": True,
            "data": {
                "ticket": ticket.data[0],
                "messages": messages.data
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/tickets/{ticket_id}/reply")
def reply_to_ticket(ticket_id: str, payload: ReplyToTicketRequest, current_user: dict = Depends(get_current_user)):
    """Reply to a support ticket"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Get ticket
        ticket = supabase.table('support_tickets').select('*').eq('id', ticket_id).limit(1).execute()
        
        if not ticket.data:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Check access
        user = supabase.table('users').select('role').eq('id', user_id).limit(1).execute()
        is_admin = user.data and user.data[0].get('role') == 'admin'
        
        if ticket.data[0]['user_id'] != user_id and not is_admin:
            raise HTTPException(status_code=403, detail="Unauthorized to reply to this ticket")
        
        # Create message
        message = {
            "ticket_id": ticket_id,
            "user_id": user_id,
            "message": payload.message,
            "is_admin_reply": payload.is_admin_reply and is_admin
        }
        
        resp = supabase.table('support_messages').insert(message).execute()
        
        # Update ticket status if closed
        if ticket.data[0]['status'] == 'closed':
            supabase.table('support_tickets').update({'status': 'open'}).eq('id', ticket_id).execute()
        
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class UpdateTicketStatusRequest(BaseModel):
    status: str  # open, in_progress, resolved, closed


@router.put("/tickets/{ticket_id}/status")
def update_ticket_status(ticket_id: str, payload: UpdateTicketStatusRequest, current_user: dict = Depends(get_current_user)):
    """Update ticket status (admin only for closed status)"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Get ticket
        ticket = supabase.table('support_tickets').select('*').eq('id', ticket_id).limit(1).execute()
        
        if not ticket.data:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Check if admin for certain statuses
        if payload.status in ['closed', 'resolved']:
            user = supabase.table('users').select('role').eq('id', user_id).limit(1).execute()
            is_admin = user.data and user.data[0].get('role') == 'admin'
            
            if not is_admin:
                raise HTTPException(status_code=403, detail="Admin access required to close tickets")
        
        resp = supabase.table('support_tickets').update({'status': payload.status}).eq('id', ticket_id).execute()
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/contact")
def get_contact_info():
    """Get contact information"""
    return {
        "success": True,
        "data": {
            "email": "support@bookyourshoot.com",
            "phone": "+92-XXX-XXXXXXX",
            "whatsapp": "+92-XXX-XXXXXXX",
            "address": "Your Address Here",
            "business_hours": "Mon-Fri: 9 AM - 6 PM PKT",
            "social_media": {
                "facebook": "https://facebook.com/bookyourshoot",
                "instagram": "https://instagram.com/bookyourshoot",
                "twitter": "https://twitter.com/bookyourshoot"
            }
        }
    }
