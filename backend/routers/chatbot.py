"""
Context-Aware AI Chatbot Router
Provides intelligent, context-aware responses based on:
- User role (client/photographer/admin)
- Booking stage (searching, booked, in-progress, completed)
- Event type (wedding, mehndi, barat, walima, corporate, birthday, etc.)
- Conversation memory (short-term, per-session)
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import os
import requests
from datetime import datetime
from backend.supabase_client import supabase
from backend.auth import get_current_user

router = APIRouter(prefix="/chatbot", tags=["AI Chatbot"])

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

# In-memory conversation store (session-based, short-term memory)
# In production, use Redis or DB for persistence
conversation_memory = {}
MAX_MEMORY_MESSAGES = 10  # Keep last 10 messages per session


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    # Context injection
    user_role: Optional[str] = None  # client, photographer, admin
    booking_stage: Optional[str] = None  # searching, booked, in_progress, completed, none
    event_type: Optional[str] = None  # wedding, mehndi, barat, walima, corporate, birthday, portrait, etc.
    current_page: Optional[str] = None  # dashboard, booking, album, reel, profile, etc.
    booking_id: Optional[str] = None  # If user is in a specific booking context


class ChatResponse(BaseModel):
    response: str
    session_id: str
    context_used: dict


def get_user_context(user_id: str) -> dict:
    """Fetch user context from database"""
    context = {
        "role": "guest",
        "name": None,
        "active_bookings": 0,
        "booking_stage": "none",
        "recent_event_types": []
    }
    
    try:
        # Get user info
        user = supabase.table('users').select('full_name, role, city').eq('id', user_id).limit(1).execute()
        if user.data:
            context["role"] = user.data[0].get("role", "client")
            context["name"] = user.data[0].get("full_name")
            context["city"] = user.data[0].get("city")
        
        # Get active bookings count and recent event types
        bookings = supabase.table('bookings').select('id, status, event_type').eq('client_id', user_id).order('created_at', desc=True).limit(5).execute()
        if bookings.data:
            active = [b for b in bookings.data if b.get('status') in ['pending', 'confirmed', 'in_progress']]
            context["active_bookings"] = len(active)
            context["recent_event_types"] = list(set([b.get('event_type') for b in bookings.data if b.get('event_type')]))
            
            # Determine booking stage from most recent
            if active:
                latest_status = active[0].get('status')
                if latest_status == 'pending':
                    context["booking_stage"] = "booked"
                elif latest_status == 'confirmed':
                    context["booking_stage"] = "confirmed"
                elif latest_status == 'in_progress':
                    context["booking_stage"] = "in_progress"
            elif bookings.data:
                context["booking_stage"] = "completed"
        
    except Exception as e:
        print(f"Error fetching user context: {e}")
    
    return context


def build_system_prompt(context: dict) -> str:
    """Build context-aware system prompt"""
    
    # Current date/time
    now = datetime.now()
    current_datetime = now.strftime("%A, %B %d, %Y at %I:%M %p")
    
    # Role-specific guidance
    role_guidance = {
        "client": """
You are helping a CLIENT who books photographers. Focus on:
- Finding and comparing photographers
- Understanding pricing and packages
- Booking process and payment
- Album builder, reel generator features
- Managing their bookings and reviews""",
        
        "photographer": """
You are helping a PHOTOGRAPHER who offers services. Focus on:
- Managing their profile and portfolio
- Handling booking requests
- Equipment rental system
- Payout and earnings
- Client communication tips
- Profile optimization for more bookings""",
        
        "admin": """
You are helping an ADMIN who manages the platform. Focus on:
- User and booking management
- Support ticket handling
- Platform statistics and reports
- CNIC verification process
- Payment and payout oversight""",
        
        "guest": """
You are helping a GUEST (not logged in). Focus on:
- Explaining platform features
- How to sign up
- Browse photographers
- Understanding pricing
- Platform benefits"""
    }
    
    # Booking stage guidance
    stage_guidance = {
        "searching": "The user is currently searching for photographers. Help them find the right match, compare options, and understand pricing.",
        "booked": "The user has a pending booking. Help them with confirmation, communication with photographer, and preparation.",
        "confirmed": "The user has a confirmed booking. Help them with event preparation, chat with photographer, and what to expect.",
        "in_progress": "The user has an ongoing shoot. Help them with real-time questions, communication, and any issues.",
        "completed": "The user has completed bookings. Help them with reviews, album builder, reel generator, and future bookings.",
        "none": "The user has no active bookings. Help them explore the platform and find photographers."
    }
    
    # Event type tips
    event_tips = {
        "wedding": "For weddings, suggest full-day coverage, multiple photographers, pre-wedding shoots, and highlight reels.",
        "mehndi": "For mehndi events, suggest vibrant photography, candid shots, dholki moments, and fun group photos.",
        "barat": "For barat, suggest drone coverage, grand entrance shots, family portraits, and emotional moments.",
        "walima": "For walima, suggest elegant couple portraits, family photos, and reception highlights.",
        "birthday": "For birthdays, suggest cake-cutting moments, candid guest shots, and fun photo booths.",
        "corporate": "For corporate events, suggest professional headshots, event coverage, and branding shots.",
        "portrait": "For portraits, suggest location selection, outfit coordination, and lighting conditions."
    }
    
    # Build the prompt
    user_role = context.get("user_role", "guest") or "guest"
    booking_stage = context.get("booking_stage", "none") or "none"
    event_type = (context.get("event_type") or "").lower()
    user_name = context.get("name", "") or ""
    current_page = context.get("current_page", "") or ""
    
    prompt = f"""You are BookBot, the intelligent AI assistant for BookYourShoot - Pakistan's premier photography booking platform.

## Current Context
- **Date/Time**: {current_datetime} (Pakistan Standard Time)
- **User Role**: {user_role.upper()}
{f'- **User Name**: {user_name}' if user_name else ''}
- **Booking Stage**: {booking_stage}
{f'- **Event Type**: {event_type}' if event_type else ''}
{f'- **Current Page**: {current_page}' if current_page else ''}
- **Active Bookings**: {context.get('active_bookings', 0)}

## Role-Specific Guidance
{role_guidance.get(user_role, role_guidance['guest'])}

## Booking Stage Context
{stage_guidance.get(booking_stage, stage_guidance['none'])}

{f"## Event-Specific Tips" + chr(10) + event_tips.get(event_type, '') if event_type in event_tips else ''}

## Platform Features
1. **Photographer Search**: 6,000+ verified photographers across 50+ cities in Pakistan
2. **Smart Booking**: Easy booking with secure payments and instant confirmation
3. **Album Builder**: AI-powered album creation with layout suggestions
4. **Reel Generator**: Create highlight reels with Spotify music integration
5. **Equipment Rental**: Rent professional photography equipment
6. **Real-time Chat**: Direct communication with photographers
7. **CNIC Verification**: Verified photographer identities for trust
8. **Secure Payments**: Escrow-based payments with buyer protection
9. **Reviews & Ratings**: Authentic reviews from verified clients

## App Navigation Links (USE THESE EXACT LINKS)
When suggesting pages, ALWAYS use these exact links:

### Public Pages (No login required)
- Home Page: [Home](/)
- Search Photographers: [Search Photographers](/search)
- Login: [Login](/login)
- Register: [Create Account](/register)
- Support: [Support](/support)
- Contact Us: [Contact](/contact)

### Client Pages (Login required)
- Client Dashboard: [Dashboard](/client/dashboard)
- My Bookings: [My Bookings](/client/bookings)
- Album Builder: [Album Builder](/client/album-builder)
- Reel Generator: [Reel Generator](/client/reel-generator)
- Music Discovery: [Music Discovery](/client/music-discovery)
- My Profile: [Profile](/client/profile)
- My Payments: [Payments](/client/payments)
- Equipment Rental: [Equipment](/client/equipment)

### Photographer Pages (Photographer login required)
- Photographer Dashboard: [Dashboard](/photographer/dashboard)
- My Bookings: [Bookings](/photographer/bookings)
- My Equipment: [Equipment](/photographer/equipment)
- My Earnings: [Earnings](/photographer/earnings)
- My Profile: [Profile](/photographer/profile)

### Admin Pages (Admin login required)
- Admin Dashboard: [Dashboard](/admin/dashboard)
- User Management: [Users](/admin/users)
- Booking Management: [Bookings](/admin/bookings)

## Booking Flow Guide
When helping with booking, guide users through these steps:
1. **Search**: Go to [Search Photographers](/search) and filter by city, event type, budget
2. **Browse**: View photographer profiles, portfolios, and reviews
3. **Book**: Click "Book Now" on photographer profile → fills out booking form
4. **Pay Advance**: 20% advance payment via secure gateway
5. **Confirm**: Photographer accepts → booking confirmed
6. **Event Day**: Photographer arrives, captures moments
7. **Final Payment**: Pay remaining 80% after event
8. **Review**: Leave review, use Album Builder & Reel Generator

## Pricing Guide
- Portrait Sessions: PKR 5,000 - 15,000
- Birthday Events: PKR 10,000 - 25,000
- Corporate Events: PKR 15,000 - 40,000
- Mehndi/Dholki: PKR 20,000 - 50,000
- Barat/Walima: PKR 30,000 - 80,000
- Full Wedding Package: PKR 80,000 - 200,000+

## Response Guidelines
1. Be friendly, helpful, and professional
2. Use the user's name if available
3. Give contextual responses based on their role and stage
4. Use Markdown formatting for better readability
5. Include actionable next steps with REAL LINKS from the list above
6. Keep responses concise but thorough
7. If unsure, ask clarifying questions
8. For support issues, guide them to [Support](/support)
9. NEVER use placeholder links like "link-to-page" - use the actual routes provided

## Contact & Support
- Email: support@bookyourshoot.com
- Support tickets available in dashboard
- FAQ section for common questions
"""
    
    return prompt


def get_conversation_history(session_id: str) -> List[dict]:
    """Get conversation history for a session"""
    if session_id in conversation_memory:
        return conversation_memory[session_id][-MAX_MEMORY_MESSAGES:]
    return []


def save_to_memory(session_id: str, role: str, content: str):
    """Save message to conversation memory"""
    if session_id not in conversation_memory:
        conversation_memory[session_id] = []
    
    conversation_memory[session_id].append({
        "role": role,
        "content": content
    })
    
    # Trim to max memory size
    if len(conversation_memory[session_id]) > MAX_MEMORY_MESSAGES:
        conversation_memory[session_id] = conversation_memory[session_id][-MAX_MEMORY_MESSAGES:]


def call_gemini_api(system_prompt: str, conversation: List[dict], user_message: str) -> str:
    """Call Gemini API with context and conversation history"""
    
    if not GEMINI_API_KEY:
        return "I'm sorry, but the AI service is not configured. Please contact support@bookyourshoot.com for assistance."
    
    # Build the full prompt with conversation history
    history_text = ""
    if conversation:
        history_text = "\n\n## Recent Conversation:\n"
        for msg in conversation[-6:]:  # Last 6 messages
            role_label = "User" if msg["role"] == "user" else "Assistant"
            history_text += f"{role_label}: {msg['content']}\n"
    
    full_prompt = f"{system_prompt}{history_text}\n\n## Current User Message:\n{user_message}\n\n## Your Response:"
    
    try:
        response = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1500,
                    "topP": 0.9
                }
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if "candidates" in data and len(data["candidates"]) > 0:
                return data["candidates"][0]["content"]["parts"][0]["text"]
            return "I couldn't generate a response. Please try again."
        else:
            print(f"Gemini API error: {response.status_code} - {response.text}")
            return "I'm having trouble connecting to my brain right now. Please try again in a moment."
            
    except requests.exceptions.Timeout:
        return "The response is taking too long. Please try again."
    except Exception as e:
        print(f"Gemini API exception: {e}")
        return "An error occurred. Please try again or contact support@bookyourshoot.com"


@router.post("/ask", response_model=ChatResponse)
def ask_chatbot(payload: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Context-aware chatbot endpoint
    
    Accepts user message with optional context (role, booking stage, event type)
    Returns AI response with conversation memory
    """
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        
        # Generate or use provided session ID
        session_id = payload.session_id or f"session_{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Build context from multiple sources
        db_context = get_user_context(user_id) if user_id else {}
        
        context = {
            "user_role": payload.user_role or db_context.get("role", "guest"),
            "booking_stage": payload.booking_stage or db_context.get("booking_stage", "none"),
            "event_type": payload.event_type or (db_context.get("recent_event_types", [None])[0] if db_context.get("recent_event_types") else None),
            "current_page": payload.current_page,
            "name": db_context.get("name"),
            "active_bookings": db_context.get("active_bookings", 0),
            "city": db_context.get("city")
        }
        
        # Build system prompt with context
        system_prompt = build_system_prompt(context)
        
        # Get conversation history
        conversation = get_conversation_history(session_id)
        
        # Call Gemini API
        response_text = call_gemini_api(system_prompt, conversation, payload.message)
        
        # Save to memory
        save_to_memory(session_id, "user", payload.message)
        save_to_memory(session_id, "assistant", response_text)
        
        return ChatResponse(
            response=response_text,
            session_id=session_id,
            context_used={
                "role": context["user_role"],
                "booking_stage": context["booking_stage"],
                "event_type": context["event_type"],
                "memory_messages": len(conversation)
            }
        )
        
    except Exception as e:
        print(f"Chatbot error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask-public")
def ask_chatbot_public(payload: ChatRequest):
    """
    Public chatbot endpoint (no auth required)
    For guests who haven't logged in yet
    """
    try:
        session_id = payload.session_id or f"guest_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        context = {
            "user_role": "guest",
            "booking_stage": "none",
            "event_type": payload.event_type,
            "current_page": payload.current_page,
            "name": None,
            "active_bookings": 0
        }
        
        system_prompt = build_system_prompt(context)
        conversation = get_conversation_history(session_id)
        response_text = call_gemini_api(system_prompt, conversation, payload.message)
        
        save_to_memory(session_id, "user", payload.message)
        save_to_memory(session_id, "assistant", response_text)
        
        return {
            "response": response_text,
            "session_id": session_id,
            "context_used": {
                "role": "guest",
                "booking_stage": "none",
                "event_type": context["event_type"],
                "memory_messages": len(conversation)
            }
        }
        
    except Exception as e:
        print(f"Public chatbot error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class FeedbackRequest(BaseModel):
    session_id: str
    message_id: str
    feedback: str  # 'up' or 'down'


# In-memory feedback store (in production, save to database)
feedback_store = []


@router.post("/feedback")
def submit_feedback(payload: FeedbackRequest):
    """Submit feedback for a chatbot response (thumbs up/down)"""
    try:
        feedback_entry = {
            "session_id": payload.session_id,
            "message_id": payload.message_id,
            "feedback": payload.feedback,
            "timestamp": datetime.now().isoformat()
        }
        feedback_store.append(feedback_entry)
        
        # Log for analytics
        emoji = "👍" if payload.feedback == "up" else "👎"
        print(f"💬 Chatbot feedback: {emoji} for message {payload.message_id}")
        
        return {"success": True, "message": "Feedback recorded"}
    except Exception as e:
        print(f"Feedback error: {e}")
        return {"success": False, "message": str(e)}


@router.get("/feedback/stats")
def get_feedback_stats():
    """Get feedback statistics (admin use)"""
    total = len(feedback_store)
    positive = sum(1 for f in feedback_store if f["feedback"] == "up")
    negative = sum(1 for f in feedback_store if f["feedback"] == "down")
    
    return {
        "total_feedback": total,
        "positive": positive,
        "negative": negative,
        "satisfaction_rate": round((positive / total * 100) if total > 0 else 0, 1)
    }


@router.delete("/memory/{session_id}")
def clear_conversation_memory(session_id: str):
    """Clear conversation memory for a session"""
    if session_id in conversation_memory:
        del conversation_memory[session_id]
        return {"success": True, "message": "Conversation memory cleared"}
    return {"success": True, "message": "No memory found for this session"}


@router.get("/health")
def chatbot_health():
    """Check chatbot service health"""
    return {
        "status": "ok",
        "gemini_configured": bool(GEMINI_API_KEY),
        "model": GEMINI_MODEL,
        "active_sessions": len(conversation_memory)
    }
