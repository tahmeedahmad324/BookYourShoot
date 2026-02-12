"""
Chat Router - Complete WebSocket-enabled chat system
Supports conversations, messages, attachments, admin features
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
from backend.supabase_client import supabase
from backend.auth import get_current_user
from backend.services.chat_websocket_manager import connection_manager
import logging

router = APIRouter(prefix="/chat", tags=["Chat"])
logger = logging.getLogger(__name__)

# ============================================
# Request/Response Models
# ============================================

class CreateConversationRequest(BaseModel):
    booking_id: str = Field(..., description="Booking ID to create conversation for")
    title: Optional[str] = Field(None, description="Optional conversation title")


class SendMessageRequest(BaseModel):
    conversation_id: str
    content: str
    content_type: str = "text"  # text, image, audio, file
    attachment_path: Optional[str] = None
    attachment_filename: Optional[str] = None
    attachment_size: Optional[int] = None
    attachment_urls: Optional[str] = None  # JSON string of uploaded file URLs


class InitAttachmentRequest(BaseModel):
    conversation_id: str
    filename: str
    content_type: str
    file_size: int


class MessageReadRequest(BaseModel):
    message_id: str


class VoiceCallLogRequest(BaseModel):
    conversation_id: str
    call_id: str
    call_status: str  # 'initiated', 'ringing', 'connected', 'ended', 'missed', 'rejected', 'busy'
    duration: Optional[int] = None  # Duration in seconds
    message_id: Optional[str] = None  # For updating existing message


# ============================================
# REST API Endpoints
# ============================================

@router.post("/conversations")
def create_conversation(
    payload: CreateConversationRequest, 
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new conversation for a booking
    Requires: booking must exist and user must be client or photographer
    """
    try:
        user_id = current_user.get("id")
        
        # Verify booking exists
        booking_resp = supabase.table('booking').select('*').eq('id', payload.booking_id).execute()
        if not booking_resp.data:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        booking = booking_resp.data[0]
        
        # Verify user is part of this booking
        if booking['client_id'] != user_id and booking['photographer_id'] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized for this booking")
        
        # Check if conversation already exists
        existing = supabase.table('conversations').select('*').eq('booking_id', payload.booking_id).execute()
        if existing.data:
            return {"success": True, "data": existing.data[0], "message": "Conversation already exists"}
        
        # Create conversation
        conversation = {
            "booking_id": payload.booking_id,
            "title": payload.title or f"Booking Chat - {booking.get('event_type', 'Event')}",
            "is_group": False
        }
        conv_resp = supabase.table('conversations').insert(conversation).execute()
        conversation_id = conv_resp.data[0]['id']
        
        # Add participants
        participants = [
            {
                "conversation_id": conversation_id,
                "user_id": booking['client_id'],
                "role": "CLIENT"
            },
            {
                "conversation_id": conversation_id,
                "user_id": booking['photographer_id'],
                "role": "PHOTOGRAPHER"
            }
        ]
        supabase.table('conversation_participants').insert(participants).execute()
        
        logger.info(f"✅ Created conversation {conversation_id} for booking {payload.booking_id}")
        
        return {"success": True, "data": conv_resp.data[0]}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/conversations")
def get_conversations(
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all conversations for current user with pagination"""
    try:
        user_id = current_user.get("id")
        
        # Use database function for efficiency
        try:
            resp = supabase.rpc('get_user_conversations', {'p_user_id': user_id}).execute()
            conversations = resp.data if resp.data else []
        except Exception as rpc_error:
            logger.warning(f"RPC function not available, using fallback query: {rpc_error}")
            # Fallback query
            conv_resp = supabase.table('conversation_participants')\
                .select('conversation_id')\
                .eq('user_id', user_id)\
                .eq('is_banned', False)\
                .execute()
            
            conversation_ids = [c['conversation_id'] for c in conv_resp.data] if conv_resp.data else []
            
            if not conversation_ids:
                return {"success": True, "data": [], "has_more": False, "next_cursor": None}
            
            # Get conversation details
            conversations_resp = supabase.table('conversations')\
                .select('*')\
                .in_('id', conversation_ids)\
                .order('updated_at', desc=True)\
                .limit(limit)\
                .execute()
            
            conversations = conversations_resp.data if conversations_resp.data else []
        
        # Apply cursor pagination if provided
        if cursor:
            conversations = [c for c in conversations if c.get('updated_at', '') < cursor]
        
        # Limit results
        conversations = conversations[:limit]
        
        # ENHANCEMENT: Add participants and other_user info to each conversation
        for conv in conversations:
            try:
                # Get all participants for this conversation
                parts_resp = supabase.table('conversation_participants')\
                    .select('user_id, role')\
                    .eq('conversation_id', conv['id'])\
                    .execute()
                
                if parts_resp.data:
                    participant_user_ids = [p['user_id'] for p in parts_resp.data]
                    
                    # Get user details for all participants
                    users_resp = supabase.table('users')\
                        .select('id, full_name, email, profile_picture_url, role')\
                        .in_('id', participant_user_ids)\
                        .execute()
                    
                    users_map = {u['id']: u for u in users_resp.data} if users_resp.data else {}
                    
                    # Build participants list with user details
                    participants = []
                    for part in parts_resp.data:
                        user = users_map.get(part['user_id'], {})
                        participants.append({
                            'user_id': part['user_id'],
                            'role': part['role'],
                            'name': user.get('full_name', 'Unknown'),
                            'email': user.get('email'),
                            'profile_picture_url': user.get('profile_picture_url'),
                            'user_role': user.get('role')
                        })
                    
                    conv['participants'] = participants
                    
                    # Find the "other user" (not the current user)
                    other_participant = next((p for p in participants if p['user_id'] != user_id), None)
                    conv['other_user'] = other_participant
                else:
                    conv['participants'] = []
                    conv['other_user'] = None
                    
            except Exception as part_error:
                logger.warning(f"Error fetching participants for conversation {conv['id']}: {part_error}")
                conv['participants'] = []
                conv['other_user'] = None
        
        return {
            "success": True,
            "data": conversations,
            "has_more": len(conversations) == limit,
            "next_cursor": conversations[-1].get('updated_at') if conversations else None
        }
    
    except Exception as e:
        logger.error(f"Error fetching conversations: {e}")
        return {"success": False, "error": str(e), "data": []}


@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(
    conversation_id: str,
    limit: int = Query(50, ge=1, le=100),
    cursor: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get messages for a conversation with pagination"""
    try:
        user_id = current_user.get("id")
        
        # Verify user is participant
        participant_check = supabase.table('conversation_participants')\
            .select('*')\
            .eq('conversation_id', conversation_id)\
            .eq('user_id', user_id)\
            .execute()
        
        if not participant_check.data:
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")
        
        participant = participant_check.data[0]
        
        # Check if banned
        if participant.get('is_banned'):
            raise HTTPException(status_code=403, detail="You are banned from this conversation")
        
        # Build query
        query = supabase.table('messages')\
            .select('*, sender:users!sender_id(id, full_name, email, role, profile_picture_url)')\
            .eq('conversation_id', conversation_id)\
            .eq('is_deleted', False)\
            .order('created_at', desc=True)\
            .limit(limit)
        
        # Apply cursor (timestamp-based)
        if cursor:
            query = query.lt('created_at', cursor)
        
        resp = query.execute()
        
        # Reverse to get chronological order
        messages = list(reversed(resp.data)) if resp.data else []
        
        # Update last_read_at for user
        supabase.table('conversation_participants')\
            .update({'last_read_at': datetime.utcnow().isoformat()})\
            .eq('conversation_id', conversation_id)\
            .eq('user_id', user_id)\
            .execute()
        
        return {
            "success": True,
            "data": messages,
            "has_more": len(resp.data) == limit,
            "next_cursor": resp.data[0]['created_at'] if resp.data else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/messages")
async def send_message_rest(
    payload: SendMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Send a message via REST (fallback for non-WebSocket clients)
    Prefer WebSocket for real-time messaging
    
    **IMPORTANT:** This endpoint enforces two-phase chat restrictions:
    - INQUIRY chats: Text only, 15 message limit, no media/files
    - CONFIRMED chats: All features unlocked
    """
    try:
        user_id = current_user.get("id")
        
        # Verify participant
        participant_check = supabase.table('conversation_participants')\
            .select('*')\
            .eq('conversation_id', payload.conversation_id)\
            .eq('user_id', user_id)\
            .execute()
        
        if not participant_check.data:
            raise HTTPException(status_code=403, detail="Not a participant")
        
        if participant_check.data[0].get('is_banned'):
            raise HTTPException(status_code=403, detail="You are banned from this conversation")
        
        # Simple validation: INQUIRY conversations only allow text
        conv_check = supabase.table('conversations')\
            .select('conversation_type')\
            .eq('id', payload.conversation_id)\
            .execute()
        
        if conv_check.data:
            conv_type = conv_check.data[0].get('conversation_type')
            # Block file uploads in INQUIRY conversations
            if conv_type == 'INQUIRY' and payload.content_type in ['image', 'video', 'file', 'audio', 'document', 'pdf']:
                raise HTTPException(
                    status_code=403, 
                    detail="File uploads not allowed in inquiry conversations. Book the photographer to unlock all features."
                )
        
        # Validate file size limits
        if payload.attachment_size:
            max_size_mb = {
                'image': 10,
                'audio': 25,
                'file': 15
            }.get(payload.content_type, 15)
            
            if payload.attachment_size > max_size_mb * 1024 * 1024:
                raise HTTPException(status_code=413, detail=f"File too large. Max size: {max_size_mb}MB")
        
        # Create message
        message = {
            "conversation_id": payload.conversation_id,
            "sender_id": user_id,
            "content": payload.content,
            "content_type": payload.content_type,
            "attachment_path": payload.attachment_path,
            "attachment_filename": payload.attachment_filename,
            "attachment_size": payload.attachment_size,
            "attachment_urls": payload.attachment_urls,
            "status": "SENT"
        }
        
        resp = supabase.table('messages').insert(message).execute()
        
        if not resp.data:
            raise HTTPException(status_code=400, detail="Failed to create message")
        
        new_message = resp.data[0]
        
        # Broadcast new message to conversation
        await connection_manager.broadcast_to_conversation(
            payload.conversation_id,
            {
                "type": "new_message",
                "message": new_message,
                "conversation_id": payload.conversation_id
            }
        )
        
        logger.info(f"Message sent via REST: {new_message['id']}")
        
        return {"success": True, "data": new_message}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/attachments/init")
def init_attachment_upload(
    payload: InitAttachmentRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Initialize file upload and get signed URL
    Returns: {upload_url, object_key, expires_in}
    """
    try:
        user_id = current_user.get("id")
        
        # Verify participant
        participant_check = supabase.table('conversation_participants')\
            .select('*')\
            .eq('conversation_id', payload.conversation_id)\
            .eq('user_id', user_id)\
            .execute()
        
        if not participant_check.data:
            raise HTTPException(status_code=403, detail="Not a participant")
        
        if participant_check.data[0].get('is_banned'):
            raise HTTPException(status_code=403, detail="You are banned from this conversation")
        
        # Validate file size
        max_size_mb = 25  # Max 25MB for any file
        if payload.file_size > max_size_mb * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"File too large. Max size: {max_size_mb}MB")
        
        # Generate unique object key
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safe_filename = payload.filename.replace(" ", "_").replace("/", "_")
        object_key = f"chat/{payload.conversation_id}/{user_id}_{timestamp}_{safe_filename}"
        
        # Generate signed upload URL (expires in 15 minutes)
        try:
            upload_url = supabase.storage.from_('chat-attachments').create_signed_upload_url(object_key)
            
            return {
                "success": True,
                "data": {
                    "upload_url": upload_url,
                    "object_key": object_key,
                    "expires_in": 900  # 15 minutes
                }
            }
        except Exception as storage_error:
            # Fallback: return object key for direct upload
            logger.warning(f"Signed URL generation failed, using fallback: {storage_error}")
            return {
                "success": True,
                "data": {
                    "object_key": object_key,
                    "bucket": "chat-attachments",
                    "expires_in": 900
                },
                "message": "Use Supabase client to upload directly"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initializing attachment: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/messages/{message_id}/read")
def mark_message_read(message_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a specific message as read (prefer WebSocket method)"""
    try:
        user_id = current_user.get("id")
        
        # Get message
        msg_resp = supabase.table('messages').select('*').eq('id', message_id).execute()
        if not msg_resp.data:
            raise HTTPException(status_code=404, detail="Message not found")
        
        message = msg_resp.data[0]
        
        # Verify user is in this conversation
        participant_check = supabase.table('conversation_participants')\
            .select('*')\
            .eq('conversation_id', message['conversation_id'])\
            .eq('user_id', user_id)\
            .execute()
        
        if not participant_check.data:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Update status
        supabase.table('messages')\
            .update({
                'status': 'READ',
                'read_at': datetime.utcnow().isoformat()
            })\
            .eq('id', message_id)\
            .execute()
        
        return {"success": True, "message": "Message marked as read"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking message read: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============================================
# Admin Endpoints
# ============================================

@router.get("/admin/conversations")
def admin_get_all_conversations(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    booking_id: Optional[str] = None,
    user_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Admin: Get all conversations with filters"""
    try:
        # Verify admin role
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        query = supabase.table('conversations')\
            .select('*, booking:booking(id, event_type, status)')\
            .order('updated_at', desc=True)\
            .range(offset, offset + limit - 1)
        
        if booking_id:
            query = query.eq('booking_id', booking_id)
        
        resp = query.execute()
        data = resp.data if resp.data else []
        
        return {"success": True, "data": data, "total": len(data)}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin error fetching conversations: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/conversations/{conversation_id}/messages")
def admin_get_conversation_messages(
    conversation_id: str,
    limit: int = Query(100, ge=1, le=500),
    include_deleted: bool = Query(False),
    current_user: dict = Depends(get_current_user)
):
    """Admin: Get all messages in a conversation (including deleted)"""
    try:
        # Verify admin role
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        query = supabase.table('messages')\
            .select('*, sender:users!sender_id(id, full_name, email, role)')\
            .eq('conversation_id', conversation_id)\
            .order('created_at', desc=False)\
            .limit(limit)
        
        if not include_deleted:
            query = query.eq('is_deleted', False)
        
        resp = query.execute()
        
        # Log admin access
        admin_id = current_user.get("id")
        supabase.table('chat_audit').insert({
            "conversation_id": conversation_id,
            "admin_id": admin_id,
            "action": "VIEW",
            "reason": "Admin conversation review"
        }).execute()
        
        return {"success": True, "data": resp.data if resp.data else []}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin error fetching messages: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/messages/{message_id}/delete")
def admin_delete_message(
    message_id: str,
    reason: str,
    current_user: dict = Depends(get_current_user)
):
    """Admin: Soft delete a message"""
    try:
        # Verify admin role
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get message
        msg_resp = supabase.table('messages').select('*').eq('id', message_id).execute()
        if not msg_resp.data:
            raise HTTPException(status_code=404, detail="Message not found")
        
        message = msg_resp.data[0]
        
        # Soft delete
        supabase.table('messages')\
            .update({
                'is_deleted': True,
                'deleted_at': datetime.utcnow().isoformat(),
                'content': '[Message deleted by admin]'
            })\
            .eq('id', message_id)\
            .execute()
        
        # Log action
        admin_id = current_user.get("id")
        supabase.table('chat_audit').insert({
            "message_id": message_id,
            "conversation_id": message['conversation_id'],
            "admin_id": admin_id,
            "action": "DELETE",
            "reason": reason
        }).execute()
        
        logger.info(f"Admin {admin_id} deleted message {message_id}: {reason}")
        
        return {"success": True, "message": "Message deleted"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin error deleting message: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/ban-user")
def admin_ban_user_from_conversation(
    conversation_id: str,
    user_id: str,
    reason: str,
    current_user: dict = Depends(get_current_user)
):
    """Admin: Ban a user from a specific conversation"""
    try:
        # Verify admin role
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        admin_id = current_user.get("id")
        
        # Check participant exists
        participant_resp = supabase.table('conversation_participants')\
            .select('*')\
            .eq('conversation_id', conversation_id)\
            .eq('user_id', user_id)\
            .execute()
        
        if not participant_resp.data:
            raise HTTPException(status_code=404, detail="User not in this conversation")
        
        # Ban user
        supabase.table('conversation_participants')\
            .update({
                'is_banned': True,
                'banned_at': datetime.utcnow().isoformat(),
                'banned_by': admin_id,
                'ban_reason': reason
            })\
            .eq('conversation_id', conversation_id)\
            .eq('user_id', user_id)\
            .execute()
        
        # Log action
        supabase.table('chat_audit').insert({
            "conversation_id": conversation_id,
            "admin_id": admin_id,
            "action": "BAN_USER",
            "reason": reason,
            "metadata": {"banned_user_id": user_id}
        }).execute()
        
        logger.info(f"Admin {admin_id} banned user {user_id} from conversation {conversation_id}: {reason}")
        
        return {"success": True, "message": "User banned from conversation"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin error banning user: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/unban-user")
def admin_unban_user_from_conversation(
    conversation_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Admin: Unban a user from a conversation"""
    try:
        # Verify admin role
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        admin_id = current_user.get("id")
        
        # Unban user
        supabase.table('conversation_participants')\
            .update({
                'is_banned': False,
                'banned_at': None,
                'banned_by': None,
                'ban_reason': None
            })\
            .eq('conversation_id', conversation_id)\
            .eq('user_id', user_id)\
            .execute()
        
        # Log action
        supabase.table('chat_audit').insert({
            "conversation_id": conversation_id,
            "admin_id": admin_id,
            "action": "UNBAN_USER",
            "reason": "User unbanned",
            "metadata": {"unbanned_user_id": user_id}
        }).execute()
        
        logger.info(f"Admin {admin_id} unbanned user {user_id} from conversation {conversation_id}")
        
        return {"success": True, "message": "User unbanned from conversation"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin error unbanning user: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/audit-logs")
def admin_get_audit_logs(
    conversation_id: Optional[str] = None,
    admin_id: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(get_current_user)
):
    """Admin: Get chat audit logs with filters"""
    try:
        # Verify admin role
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        query = supabase.table('chat_audit')\
            .select('*, admin:users!admin_id(full_name, email)')\
            .order('created_at', desc=True)\
            .limit(limit)
        
        if conversation_id:
            query = query.eq('conversation_id', conversation_id)
        
        if admin_id:
            query = query.eq('admin_id', admin_id)
        
        resp = query.execute()
        
        return {"success": True, "data": resp.data if resp.data else []}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin error fetching audit logs: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/voice-call-log")
async def log_voice_call(
    payload: VoiceCallLogRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create or update voice call log message in chat
    Call statuses: initiated, ringing, connected, ended, missed, rejected, busy
    """
    try:
        user_id = current_user.get("id")
        
        # Verify participant
        participant_check = supabase.table('conversation_participants')\
            .select('*')\
            .eq('conversation_id', payload.conversation_id)\
            .eq('user_id', user_id)\
            .execute()
        
        if not participant_check.data:
            raise HTTPException(status_code=403, detail="Not a participant")
        
        # Build message content based on call status
        call_status_messages = {
            'initiated': '📞 Voice call started...',
            'ringing': '📞 Ringing...',
            'connected': '📞 Call in progress...',
            'ended': f'📞 Call ended • {format_duration(payload.duration)}' if payload.duration else '📞 Call ended',
            'missed': '📞 Missed call',
            'rejected': '📞 Call declined',
            'busy': '📞 User busy'
        }
        
        content = call_status_messages.get(payload.call_status, '📞 Voice call')
        
        # If message_id provided, update existing message
        if payload.message_id:
            update_data = {
                "content": content
            }
            
            resp = supabase.table('messages')\
                .update(update_data)\
                .eq('id', payload.message_id)\
                .eq('sender_id', user_id)\
                .execute()
            
            if not resp.data:
                raise HTTPException(status_code=404, detail="Message not found or unauthorized")
            
            updated_message = resp.data[0]
            
            logger.info(f"📞 Broadcasting call log update: {payload.call_status} to conversation {payload.conversation_id}")
            
            # Broadcast update to conversation
            await connection_manager.broadcast_to_conversation(
                payload.conversation_id,
                {
                    "type": "message_updated",
                    "message": updated_message,
                    "conversation_id": payload.conversation_id
                }
            )
            
            logger.info(f"✅ Call log update broadcasted successfully")
            
            return {
                "success": True,
                "data": updated_message,
                "message": "Call log updated"
            }
        
        # Otherwise, create new message
        message = {
            "conversation_id": payload.conversation_id,
            "sender_id": user_id,
            "content": content,
            "content_type": "text",  # Store as text for compatibility
            "status": "SENT"
        }
        
        resp = supabase.table('messages').insert(message).execute()
        
        if not resp.data:
            raise HTTPException(status_code=400, detail="Failed to create call log")
        
        new_message = resp.data[0]
        
        logger.info(f"📞 Broadcasting new call log: {payload.call_status} to conversation {payload.conversation_id}")
        logger.info(f"📞 Message ID: {new_message.get('id')}, Content: {new_message.get('content')}")
        
        # Broadcast new message to conversation
        await connection_manager.broadcast_to_conversation(
            payload.conversation_id,
            {
                "type": "new_message",
                "message": new_message,
                "conversation_id": payload.conversation_id
            }
        )
        
        logger.info(f"✅ New call log broadcasted successfully")
        
        return {
            "success": True,
            "data": new_message,
            "message": "Call log created"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging voice call: {e}")
        raise HTTPException(status_code=400, detail=str(e))


def format_duration(seconds):
    """Format call duration in MM:SS or HH:MM:SS"""
    if not seconds:
        return "00:00"
    
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    else:
        return f"{minutes:02d}:{secs:02d}"
