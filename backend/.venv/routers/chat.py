from fastapi import APIRouter

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("/session")
def create_chat_session():
    return {"msg": "chat session created"}

@router.get("/session/{session_id}")
def get_chat_session(session_id: str):
    return {"msg": f"chat session {session_id}"}

@router.post("/message")
def send_message():
    return {"msg": "message sent"}

@router.get("/message/{session_id}")
def list_messages(session_id: str):
    return {"msg": f"messages for {session_id}"}
