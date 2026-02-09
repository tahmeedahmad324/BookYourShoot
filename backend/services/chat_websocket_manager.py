"""
WebSocket Connection Manager for Chat Module
Handles real-time connections, message broadcasting, presence tracking

In-memory implementation with Redis-ready architecture
"""

from fastapi import WebSocket
from typing import Dict, List, Set, Optional
from datetime import datetime, timedelta
import json
import asyncio
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time chat
    
    Architecture:
    - In-memory storage (fast, single-server)
    - Redis-ready design (easy migration for multi-server scaling)
    """
    
    def __init__(self):
        # Active connections: {user_id: [WebSocket, WebSocket, ...]}
        # Multiple connections per user (different tabs/devices)
        self.active_connections: Dict[str, List[WebSocket]] = defaultdict(list)
        
        # User presence: {user_id: {"status": "online", "last_seen": datetime}}
        self.user_presence: Dict[str, dict] = {}
        
        # Conversation memberships: {conversation_id: {user_id, user_id, ...}}
        self.conversation_members: Dict[str, Set[str]] = defaultdict(set)
        
        # Typing indicators: {conversation_id: {user_id: expires_at}}
        self.typing_users: Dict[str, Dict[str, datetime]] = defaultdict(dict)
        
        # User to conversations mapping: {user_id: {conv_id, conv_id, ...}}
        self.user_conversations: Dict[str, Set[str]] = defaultdict(set)
        
        logger.info("✅ ConnectionManager initialized (in-memory mode)")
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept WebSocket connection and register user"""
        await websocket.accept()
        self.active_connections[user_id].append(websocket)
        
        # Update presence
        self.user_presence[user_id] = {
            "status": "online",
            "last_seen": datetime.utcnow(),
            "connection_count": len(self.active_connections[user_id])
        }
        
        logger.info(f"✅ User {user_id} connected (total connections: {len(self.active_connections[user_id])})")
        
        # Broadcast presence to user's conversations
        await self.broadcast_presence_update(user_id, "online")
    
    async def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove WebSocket connection and update presence"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            
            # If no more connections, mark offline
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                self.user_presence[user_id] = {
                    "status": "offline",
                    "last_seen": datetime.utcnow()
                }
                await self.broadcast_presence_update(user_id, "offline")
                logger.info(f"🔴 User {user_id} disconnected (offline)")
            else:
                # Still has other connections
                self.user_presence[user_id]["connection_count"] = len(self.active_connections[user_id])
                logger.info(f"🟡 User {user_id} disconnected one tab (still online: {len(self.active_connections[user_id])} connections)")
    
    def join_conversation(self, user_id: str, conversation_id: str):
        """Register user as member of conversation"""
        self.conversation_members[conversation_id].add(user_id)
        self.user_conversations[user_id].add(conversation_id)
        logger.info(f"User {user_id} joined conversation {conversation_id}")
    
    def leave_conversation(self, user_id: str, conversation_id: str):
        """Remove user from conversation"""
        if conversation_id in self.conversation_members:
            self.conversation_members[conversation_id].discard(user_id)
        if user_id in self.user_conversations:
            self.user_conversations[user_id].discard(conversation_id)
        logger.info(f"User {user_id} left conversation {conversation_id}")
    
    async def send_personal_message(self, user_id: str, message: dict):
        """Send message to specific user (all their connections)"""
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to {user_id}: {e}")
                    disconnected.append(connection)
            
            # Clean up dead connections
            for conn in disconnected:
                await self.disconnect(conn, user_id)
    
    async def broadcast_to_conversation(self, conversation_id: str, message: dict, exclude_user: Optional[str] = None):
        """Broadcast message to all members of a conversation"""
        members = self.conversation_members.get(conversation_id, set())
        
        for user_id in members:
            if exclude_user and user_id == exclude_user:
                continue
            await self.send_personal_message(user_id, message)
        
        logger.debug(f"Broadcasted to {len(members)} members in conversation {conversation_id}")
    
    async def broadcast_presence_update(self, user_id: str, status: str):
        """Notify all user's conversations about presence change"""
        conversations = self.user_conversations.get(user_id, set())
        
        # Send user_online or user_offline event type (frontend expects this)
        event_type = "user_online" if status == "online" else "user_offline"
        presence_message = {
            "type": event_type,
            "user_id": user_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        for conv_id in conversations:
            await self.broadcast_to_conversation(conv_id, presence_message, exclude_user=user_id)
    
    async def set_typing_indicator(self, conversation_id: str, user_id: str, is_typing: bool):
        """Set or clear typing indicator"""
        if is_typing:
            # Set typing with 5-second expiry
            self.typing_users[conversation_id][user_id] = datetime.utcnow() + timedelta(seconds=5)
        else:
            # Clear typing
            if conversation_id in self.typing_users:
                self.typing_users[conversation_id].pop(user_id, None)
        
        # Broadcast typing status
        typing_message = {
            "type": "typing",
            "conversation_id": conversation_id,
            "user_id": user_id,
            "is_typing": is_typing,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.broadcast_to_conversation(conversation_id, typing_message, exclude_user=user_id)
    
    async def cleanup_expired_typing_indicators(self):
        """Remove expired typing indicators (run periodically)"""
        now = datetime.utcnow()
        
        for conv_id in list(self.typing_users.keys()):
            for user_id in list(self.typing_users[conv_id].keys()):
                if self.typing_users[conv_id][user_id] < now:
                    del self.typing_users[conv_id][user_id]
                    
                    # Broadcast typing stopped
                    await self.broadcast_to_conversation(
                        conv_id,
                        {
                            "type": "typing",
                            "conversation_id": conv_id,
                            "user_id": user_id,
                            "is_typing": False,
                            "timestamp": now.isoformat()
                        },
                        exclude_user=user_id
                    )
            
            # Remove empty conversation entries
            if not self.typing_users[conv_id]:
                del self.typing_users[conv_id]
    
    def get_presence(self, user_id: str) -> dict:
        """Get user's current presence status"""
        if user_id in self.user_presence:
            return self.user_presence[user_id]
        return {
            "status": "offline",
            "last_seen": None
        }
    
    def get_online_users(self, conversation_id: str) -> List[str]:
        """Get list of online users in a conversation"""
        members = self.conversation_members.get(conversation_id, set())
        online_users = [
            user_id for user_id in members
            if user_id in self.active_connections
        ]
        return online_users
    
    def get_connection_stats(self) -> dict:
        """Get connection statistics (for monitoring)"""
        total_connections = sum(len(conns) for conns in self.active_connections.values())
        return {
            "total_users_online": len(self.active_connections),
            "total_connections": total_connections,
            "total_conversations": len(self.conversation_members),
            "users_typing": sum(len(users) for users in self.typing_users.values())
        }


# Global singleton instance
connection_manager = ConnectionManager()


# ============================================
# Redis Migration Helper (Future Enhancement)
# ============================================
"""
To migrate to Redis:

1. Install redis package:
   pip install redis aioredis

2. Create RedisConnectionManager class:
   - Use Redis HSET for user_presence
   - Use Redis SETEX for typing indicators
   - Use Redis Pub/Sub for broadcasting
   - Use Redis SETS for conversation_members

3. Replace connection_manager instantiation:
   connection_manager = RedisConnectionManager(redis_url="redis://localhost:6379")

4. No changes needed in websocket endpoint or chat router!
"""
