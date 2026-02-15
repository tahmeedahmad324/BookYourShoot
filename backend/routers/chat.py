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


class CreateDirectConversationRequest(BaseModel):
    photographer_id: Optional[str] = Field(None, description="Photographer ID to chat with (for clients)")
    target_user_id: Optional[str] = Field(None, description="Target user ID to chat with (any direction)")
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


@router.post("/conversations/direct")
def create_direct_conversation(
    payload: CreateDirectConversationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a direct conversation with a photographer (no booking required)
    This enables inquiry/pre-booking messaging
    
    Features:
    - Creates INQUIRY type conversation by default
    - Returns existing conversation if one already exists
    - Automatically adds both participants
    """
    try:
        user_id = current_user.get("id")
        # Support both photographer_id (legacy) and target_user_id (new bidirectional)
        target_id = payload.target_user_id or payload.photographer_id
        
        if not target_id:
            raise HTTPException(status_code=400, detail="Either target_user_id or photographer_id is required")
        
        # Verify target user exists
        target_resp = supabase.table('users')\
            .select('id, full_name, role')\
            .eq('id', target_id)\
            .execute()
        
        if not target_resp.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        target_user = target_resp.data[0]
        
        # Prevent messaging yourself
        if target_id == user_id:
            raise HTTPException(status_code=400, detail="Cannot message yourself")
        
        # Check if a direct conversation already exists between these two users
        # Find conversations where both users are participants (no booking_id)
        existing_participants = supabase.table('conversation_participants')\
            .select('conversation_id')\
            .eq('user_id', user_id)\
            .execute()
        
        if existing_participants.data:
            conversation_ids = [p['conversation_id'] for p in existing_participants.data]
            
            # Check which of these conversations also has the target user as participant
            for conv_id in conversation_ids:
                # Get conversation details
                conv_check = supabase.table('conversations')\
                    .select('*')\
                    .eq('id', conv_id)\
                    .is_('booking_id', 'null')\
                    .execute()
                
                if conv_check.data:
                    # Check if target user is in this conversation
                    target_participant = supabase.table('conversation_participants')\
                        .select('*')\
                        .eq('conversation_id', conv_id)\
                        .eq('user_id', target_id)\
                        .execute()
                    
                    if target_participant.data:
                        # Found existing direct conversation
                        logger.info(f"✅ Found existing direct conversation {conv_id} between {user_id} and {target_id}")
                        return {
                            "success": True,
                            "data": conv_check.data[0],
                            "message": "Existing conversation found",
                            "is_new": False
                        }
        
        # No existing conversation found, create new one
        conversation = {
            "booking_id": None,  # Direct conversation, no booking
            "title": payload.title or f"Chat with {target_user['full_name']}",
            "is_group": False,
            "conversation_type": "INQUIRY"  # Start as inquiry, can upgrade later
        }
        
        conv_resp = supabase.table('conversations').insert(conversation).execute()
        
        if not conv_resp.data:
            raise HTTPException(status_code=400, detail="Failed to create conversation")
        
        conversation_id = conv_resp.data[0]['id']
        
        # Add participants
        participants = [
            {
                "conversation_id": conversation_id,
                "user_id": user_id,
                "role": current_user.get("role", "CLIENT").upper()
            },
            {
                "conversation_id": conversation_id,
                "user_id": target_id,
                "role": target_user['role'].upper()
            }
        ]
        
        supabase.table('conversation_participants').insert(participants).execute()
        
        logger.info(f"✅ Created direct conversation {conversation_id} between {user_id} and {target_id}")
        
        # Create notification for the target user
        target_role = target_user['role']
        chat_link = f"/{target_role}/chat?conversation={conversation_id}"
        
        notification_data = {
            "user_id": target_id,
            "title": "New Message Request",
            "message": f"{current_user.get('full_name', 'Someone')} wants to chat with you!",
            "type": "message",
            "link": chat_link,
            "read": False
        }
        
        try:
            supabase.table('notifications').insert(notification_data).execute()
        except Exception as notif_err:
            logger.error(f"Failed to create notification: {notif_err}")
        
        return {
            "success": True,
            "data": conv_resp.data[0],
            "message": "New conversation created",
            "is_new": True,
            "other_user": {
                "user_id": target_id,
                "name": target_user.get('full_name', 'Unknown'),
                "email": target_user.get('email'),
                "profile_picture_url": target_user.get('profile_picture_url'),
                "user_role": target_user.get('role')
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating direct conversation: {e}")
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
        
        # ENHANCEMENT: Add participants, other_user info, and unread count to each conversation
        for conv in conversations:
            try:
                # Get all participants for this conversation
                parts_resp = supabase.table('conversation_participants')\
                    .select('user_id, role, last_read_at')\
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
                    current_user_last_read = None
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
                        # Track current user's last read timestamp
                        if part['user_id'] == user_id:
                            current_user_last_read = part.get('last_read_at')
                    
                    conv['participants'] = participants
                    
                    # Find the "other user" (not the current user)
                    other_participant = next((p for p in participants if p['user_id'] != user_id), None)
                    conv['other_user'] = other_participant
                    
                    # Calculate unread count: messages sent by others after user's last_read_at
                    if current_user_last_read:
                        unread_resp = supabase.table('messages')\
                            .select('id', count='exact')\
                            .eq('conversation_id', conv['id'])\
                            .neq('sender_id', user_id)\
                            .gt('created_at', current_user_last_read)\
                            .eq('is_deleted', False)\
                            .execute()
                        conv['unread_count'] = unread_resp.count if unread_resp.count else 0
                    else:
                        # If user never read, count all messages from others
                        unread_resp = supabase.table('messages')\
                            .select('id', count='exact')\
                            .eq('conversation_id', conv['id'])\
                            .neq('sender_id', user_id)\
                            .eq('is_deleted', False)\
                            .execute()
                        conv['unread_count'] = unread_resp.count if unread_resp.count else 0
                else:
                    conv['participants'] = []
                    conv['other_user'] = None
                    conv['unread_count'] = 0
                    
            except Exception as part_error:
                logger.warning(f"Error fetching participants for conversation {conv['id']}: {part_error}")
                conv['participants'] = []
                conv['other_user'] = None
                conv['unread_count'] = 0
        
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
        
        # Get sender info for notification
        sender_info = supabase.table('users')\
            .select('full_name')\
            .eq('id', user_id)\
            .execute()
        sender_name = sender_info.data[0].get('full_name', 'Someone') if sender_info.data else 'Someone'
        
        # Get other participants for notification
        participants = supabase.table('conversation_participants')\
            .select('user_id')\
            .eq('conversation_id', payload.conversation_id)\
            .neq('user_id', user_id)\
            .execute()
        
        # Create notification for other participants
        for participant in (participants.data or []):
            other_user_id = participant.get('user_id')
            if other_user_id:
                # Get recipient's role to set correct link
                recipient_info = supabase.table('users')\
                    .select('role')\
                    .eq('id', other_user_id)\
                    .execute()
                recipient_role = recipient_info.data[0].get('role', 'client') if recipient_info.data else 'client'
                
                # Set role-specific chat link
                if recipient_role == 'photographer':
                    chat_link = f"/photographer/chat?conversation={payload.conversation_id}"
                elif recipient_role == 'admin':
                    chat_link = f"/admin/chat?conversation={payload.conversation_id}"
                else:
                    chat_link = f"/client/chat?conversation={payload.conversation_id}"
                
                notification_data = {
                    "user_id": other_user_id,
                    "title": "New Message",
                    "message": f"{sender_name}: {payload.content[:100]}..." if len(payload.content) > 100 else f"{sender_name}: {payload.content}",
                    "type": "message",
                    "link": chat_link,
                    "read": False
                }
                try:
                    notif_resp = supabase.table('notifications').insert(notification_data).execute()
                    if notif_resp.data:
                        # Broadcast notification via WebSocket in real-time
                        await connection_manager.send_personal_message(
                            other_user_id,
                            {
                                "type": "notification",
                                "notification": notif_resp.data[0]
                            }
                        )
                        logger.info(f"📢 Sent notification to user {other_user_id} via WebSocket")
                except Exception as notif_err:
                    logger.error(f"Failed to create notification: {notif_err}")
        
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
