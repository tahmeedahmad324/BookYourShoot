from pathlib import Path
import sys
import warnings
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Suppress NumPy warnings on Windows
warnings.filterwarnings('ignore', category=RuntimeWarning, module='numpy')

# Ensure project root is on sys.path so `import backend.*` works when executing
# the script as `python backend/main.py` from the project root.
project_root = str(Path(__file__).resolve().parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from fastapi import FastAPI, Request, status, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime
import logging
import json

# Import routers via package-qualified names
from backend.routers import (
    auth, 
    photographers, 
    booking, 
    cnic, 
    reviews, 
    chat,
    equipment, 
    music, 
    admin, 
    profile, 
    complaints, 
    support, 
    travel,
    reels,
    payments,
    payouts,
    albums,
    album_builder,  # Fresh Album Builder Implementation
    notifications,
    jobs,
    settings,
    chatbot,
    ai_detection
)
from backend.services.payment_service import payment_service, StripeGateway
from backend.services.chat_websocket_manager import connection_manager
from backend.auth import get_current_user
from pathlib import Path
import json

logger = logging.getLogger(__name__)

# OpenAPI configuration for Swagger UI auth
app = FastAPI(
    title="BookYourShoot API",
    version="1.0.0",
    swagger_ui_parameters={
        "persistAuthorization": True
    }
)

# Add security scheme for Bearer token authentication
from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="BookYourShoot API",
        version="1.0.0",
        description="BookYourShoot Photography Platform API",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter: mock-jwt-token-client (or mock-jwt-token-photographer, mock-jwt-token-admin) for testing"
        }
    }
    # Apply security globally
    openapi_schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Mount static files for album images (Module 6: Smart Album Builder)
# Use absolute path to avoid issues when running from different directories
import os
BASE_DIR = Path(__file__).resolve().parent
storage_path = BASE_DIR / "storage"
storage_path.mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(storage_path)), name="storage")
print(f"✅ Static file serving enabled: /storage -> {storage_path.absolute()}")

# Initialize Stripe for payments (FYP Demo)
stripe_secret = os.getenv("STRIPE_SECRET_KEY", "")
stripe_publishable = os.getenv("STRIPE_PUBLISHABLE_KEY", "")

if stripe_secret and stripe_publishable:
    payment_service.register_gateway(
        "stripe",
        StripeGateway(secret_key=stripe_secret, publishable_key=stripe_publishable)
    )
    print(f"✅ Stripe gateway registered successfully")
else:
    print("⚠️  WARNING: Stripe keys not found in .env file!")
    print("   Payment endpoints will return 503 errors.")
    print("   Please add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to backend/.env")

# Add global exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = None
    try:
        body = await request.body()
        body = body.decode('utf-8')[:500] if body else None
    except:
        pass
    print(f"\n❌ Validation error for {request.url.path}:")
    for error in exc.errors():
        print(f"   Field: {error.get('loc')} - {error.get('msg')} (type: {error.get('type')})")
    if body:
        print(f"   Body preview: {body[:200]}...")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": str(exc.body)[:500] if exc.body else None},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routes under /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(photographers.router, prefix="/api")
app.include_router(booking.router, prefix="/api")
app.include_router(cnic.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(equipment.router, prefix="/api")
app.include_router(music.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(complaints.router, prefix="/api")
app.include_router(support.router, prefix="/api")
app.include_router(travel.router, prefix="/api")
app.include_router(reels.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(payouts.router, prefix="/api")
app.include_router(albums.router, prefix="/api")
app.include_router(album_builder.router, prefix="/api")  # Fresh Album Builder
app.include_router(notifications.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(chatbot.router, prefix="/api")
app.include_router(ai_detection.router, prefix="/api")  # AI Event & Mood Detection


# ============================================
# WebSocket Endpoint for Real-Time Chat
# ============================================

@app.websocket("/ws/chat")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT token for authentication")
):
    """
    WebSocket endpoint for real-time chat
    URL: ws://localhost:8000/ws/chat?token=<jwt_token>
    
    Events handled:
    - join_conversation
    - leave_conversation
    - send_message
    - typing
    - message_read
    """
    user_id = None
    
    try:
        # Authenticate user from token
        from backend.supabase_client import supabase
        from backend.config import DEV_MODE
        
        # Mock token support for development
        if DEV_MODE and token.startswith('mock-jwt-token'):
            parts = token.split('-')
            role = parts[-1] if len(parts) > 3 else 'client'
            
            # Use consistent UUIDs for mock users (same as auth.py)
            mock_user_ids = {
                'client': '257f9b67-99fa-44ce-ae67-6229c36380b5',
                'photographer': '21bf398a-e012-4c4d-9b55-caeac7ec6dc7',
                'admin': '5fb7a96b-3dd0-4d44-9631-c07a256292ee'
            }
            user_id = mock_user_ids.get(role, '257f9b67-99fa-44ce-ae67-6229c36380b5')
            logger.info(f"⚠️  DEV MODE: WebSocket using mock {role} user: {user_id}")
        else:
            # Real token validation
            try:
                if hasattr(supabase.auth, 'get_user'):
                    user_resp = supabase.auth.get_user(token)
                    supabase_user = getattr(user_resp, 'user', None) or user_resp
                else:
                    user_resp = supabase.auth.api.get_user(token)
                    supabase_user = getattr(user_resp, 'user', None) or user_resp
                
                user_id = supabase_user.id if hasattr(supabase_user, 'id') else supabase_user.get('id')
                
                if not user_id:
                    await websocket.close(code=1008, reason="Invalid token")
                    return
            except Exception as auth_error:
                logger.error(f"WebSocket auth error: {auth_error}")
                await websocket.close(code=1008, reason="Authentication failed")
                return
        
        # Connect user
        await connection_manager.connect(websocket, user_id)
        logger.info(f"✅ WebSocket connected: {user_id}")
        
        # Main message loop
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                event_type = message.get('type')
                
                # Handle join_conversations (plural) - join all user's conversations
                if event_type == 'join_conversations':
                    # Fetch all conversations user is part of
                    conv_resp = supabase.table('conversation_participants')\
                        .select('conversation_id')\
                        .eq('user_id', user_id)\
                        .execute()
                    
                    if conv_resp.data:
                        for conv in conv_resp.data:
                            connection_manager.join_conversation(user_id, conv['conversation_id'])
                        logger.info(f"User {user_id} joined {len(conv_resp.data)} conversations")
                    
                    # NOW broadcast presence after joining conversations
                    await connection_manager.broadcast_presence_update(user_id, "online")
                    
                    # Send confirmation
                    await websocket.send_json({
                        "type": "joined_conversations",
                        "count": len(conv_resp.data) if conv_resp.data else 0
                    })
                
                elif event_type == 'join_conversation':
                    conversation_id = message.get('conversation_id')
                    connection_manager.join_conversation(user_id, conversation_id)
                    
                    # Broadcast presence
                    await connection_manager.broadcast_to_conversation(
                        conversation_id,
                        {
                            "type": "user_joined",
                            "user_id": user_id,
                            "timestamp": str(datetime.utcnow())
                        }
                    )
                
                elif event_type == 'leave_conversation':
                    conversation_id = message.get('conversation_id')
                    connection_manager.leave_conversation(user_id, conversation_id)
                
                elif event_type == 'send_message':
                    # Persist message to database
                    conversation_id = message.get('conversation_id')
                    content = message.get('content')
                    content_type = message.get('content_type', 'text')
                    temp_id = message.get('temp_id')
                    
                    # Simple validation: INQUIRY conversations only allow text
                    conv_check = supabase.table('conversations')\
                        .select('conversation_type')\
                        .eq('id', conversation_id)\
                        .execute()
                    
                    if conv_check.data:
                        conv_type = conv_check.data[0].get('conversation_type')
                        # Block file uploads in INQUIRY conversations
                        if conv_type == 'INQUIRY' and content_type in ['image', 'file', 'audio']:
                            await websocket.send_json({
                                "type": "error",
                                "code": "FEATURE_RESTRICTED",
                                "message": "File uploads not allowed in inquiry conversations. Book the photographer to unlock all features.",
                                "temp_id": temp_id,
                                "conversation_type": conv_type
                            })
                            logger.warning(f"File upload blocked in INQUIRY conversation {conversation_id}")
                            continue  # Skip to next message
                    
                    # Save to database
                    msg_data = {
                        "conversation_id": conversation_id,
                        "sender_id": user_id,
                        "content": content,
                        "content_type": content_type,
                        "status": "SENT"
                    }
                    
                    # Include attachment_urls if provided
                    attachment_urls = message.get('attachment_urls')
                    if attachment_urls:
                        msg_data['attachment_urls'] = attachment_urls
                    
                    msg_resp = supabase.table('messages').insert(msg_data).execute()
                    saved_message = msg_resp.data[0] if msg_resp.data else None
                    
                    if saved_message:
                        # Get updated conversation info (for inquiry limits)
                        conv_info = supabase.table('conversations')\
                            .select('conversation_type, inquiry_message_limit, inquiry_messages_sent')\
                            .eq('id', conversation_id)\
                            .execute()
                        
                        conv_data = conv_info.data[0] if conv_info.data else {}
                        
                        # Calculate remaining messages for inquiry
                        inquiry_status = None
                        if conv_data.get('conversation_type') == 'INQUIRY':
                            limit = conv_data.get('inquiry_message_limit', 15)
                            sent = conv_data.get('inquiry_messages_sent', 0)
                            remaining = max(0, limit - sent)
                            
                            inquiry_status = {
                                "messages_remaining": remaining,
                                "is_at_limit": remaining == 0,
                                "warning_level": "critical" if remaining <= 3 else "low" if remaining <= 5 else None
                            }
                        
                        # Broadcast to conversation with updated inquiry status
                        await connection_manager.broadcast_to_conversation(
                            conversation_id,
                            {
                                "type": "new_message",
                                "message": saved_message,
                                "conversation_id": conversation_id,
                                "temp_id": temp_id,
                                "inquiry_status": inquiry_status  # Include limit info
                            }
                        )
                
                elif event_type == 'typing':
                    conversation_id = message.get('conversation_id')
                    is_typing = message.get('is_typing', True)
                    await connection_manager.set_typing_indicator(conversation_id, user_id, is_typing)
                
                elif event_type == 'message_read':
                    message_id = message.get('message_id')
                    conversation_id = message.get('conversation_id')
                    
                    # Update database
                    supabase.table('messages')\
                        .update({'status': 'READ', 'read_at': datetime.utcnow().isoformat()})\
                        .eq('id', message_id)\
                        .execute()
                    
                    # Broadcast read status
                    await connection_manager.broadcast_to_conversation(
                        conversation_id,
                        {
                            "type": "message_status",
                            "message_id": message_id,
                            "status": "READ"
                        },
                        exclude_user=user_id
                    )
            
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON from {user_id}")
            except Exception as msg_error:
                logger.error(f"Error processing message from {user_id}: {msg_error}")
    
    except Exception as e:
        logger.error(f"WebSocket error for {user_id}: {e}")
    
    finally:
        # Disconnect user
        if user_id:
            await connection_manager.disconnect(websocket, user_id)
            logger.info(f"🔴 WebSocket disconnected: {user_id}")


# ============================================
# Regular HTTP Routes
# ============================================

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "BookYourShoot API is running",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "photographers": "/api/photographers",
            "bookings": "/api/bookings",
            "reviews": "/api/reviews",
            "chat": "/api/chat",
            "equipment": "/api/equipment",
            "music": "/api/music",
            "admin": "/api/admin",
            "profile": "/api/profile",
            "complaints": "/api/complaints",
            "support": "/api/support",
            "travel": "/api/travel",
            "cnic": "/api/cnic",
            "reels": "/api/reels",
            "payments": "/api/payments",
            "payouts": "/api/payouts",
            "albums": "/api/albums",
            "album-builder": "/api/album-builder",
            "notifications": "/api/notifications",
            "jobs": "/api/jobs",
            "settings": "/api/settings",
            "ai": "/api/ai"  # AI Event & Mood Detection
        }
    }


if __name__ == "__main__":
    import uvicorn
    # Get port from environment variable (default: 8000)
    port = int(os.getenv("BACKEND_PORT", "8000"))
    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    
    print(f"\n🚀 Starting BookYourShoot Backend Server")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   API URL: http://{host}:{port}")
    print(f"   Swagger Docs: http://{host}:{port}/docs")
    print(f"   WebSocket: ws://{host}:{port}/ws/chat")
    print(f"\n   Press CTRL+C to quit\n")
    
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)
