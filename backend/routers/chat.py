from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from backend.supabase_client import supabase
from backend.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat"])


class SendMessageRequest(BaseModel):
    receiver_id: str
    message: str
    message_type: str = "text"  # text, image, file
    attachment_url: Optional[str] = None


@router.post("/messages")
def send_message(payload: SendMessageRequest, current_user: dict = Depends(get_current_user)):
    """Send a chat message"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        message = {
            "sender_id": user_id,
            "receiver_id": payload.receiver_id,
            "message": payload.message,
            "message_type": payload.message_type,
            "attachment_url": payload.attachment_url,
            "is_read": False
        }

        resp = supabase.table('chat_messages').insert(message).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/conversations")
def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get all conversations for current user"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Get all unique conversation partners with last message
        resp = supabase.rpc('get_user_conversations', {'user_id': user_id}).execute()
        
        # If RPC function doesn't exist, fallback to manual query
        if not hasattr(resp, 'data') or resp.data is None:
            # Get messages where user is sender or receiver
            messages = supabase.table('chat_messages').select('*, sender:users!sender_id(*), receiver:users!receiver_id(*)').or_(f'sender_id.eq.{user_id},receiver_id.eq.{user_id}').order('created_at', desc=True).execute()
            
            # Group by conversation partner
            conversations = {}
            for msg in messages.data:
                partner_id = msg['receiver_id'] if msg['sender_id'] == user_id else msg['sender_id']
                if partner_id not in conversations:
                    conversations[partner_id] = {
                        'partner': msg['receiver'] if msg['sender_id'] == user_id else msg['sender'],
                        'last_message': msg,
                        'unread_count': 0
                    }
                
                # Count unread messages
                if msg['receiver_id'] == user_id and not msg['is_read']:
                    conversations[partner_id]['unread_count'] += 1
            
            return {"success": True, "data": list(conversations.values())}
        
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/messages/{partner_id}")
def get_messages(partner_id: str, limit: int = 50, offset: int = 0, current_user: dict = Depends(get_current_user)):
    """Get all messages between current user and a specific partner"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Get messages between both users
        resp = supabase.table('chat_messages').select('*, sender:users!sender_id(full_name, email), receiver:users!receiver_id(full_name, email)').or_(f'and(sender_id.eq.{user_id},receiver_id.eq.{partner_id}),and(sender_id.eq.{partner_id},receiver_id.eq.{user_id})').order('created_at', desc=False).range(offset, offset + limit - 1).execute()
        
        # Mark messages as read
        supabase.table('chat_messages').update({'is_read': True}).eq('sender_id', partner_id).eq('receiver_id', user_id).eq('is_read', False).execute()
        
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.put("/messages/{message_id}/read")
def mark_message_read(message_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a message as read"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        resp = supabase.table('chat_messages').update({'is_read': True}).eq('id', message_id).eq('receiver_id', user_id).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/unread-count")
def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get total unread message count for current user"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        resp = supabase.table('chat_messages').select('id', count='exact').eq('receiver_id', user_id).eq('is_read', False).execute()
        return {"success": True, "count": len(resp.data) if resp.data else 0}
    except Exception as e:
        return {"success": False, "error": str(e)}
