from pathlib import Path
import sys
import warnings

# Suppress NumPy warnings on Windows
warnings.filterwarnings('ignore', category=RuntimeWarning, module='numpy')

# Ensure project root is on sys.path so `import backend.*` works when executing
# the script as `python backend/main.py` from the project root.
project_root = str(Path(__file__).resolve().parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

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
    reels
)

app = FastAPI(title="BookYourShoot API", version="1.0.0")

# Add global exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"Validation error for {request.url.path}:")
    print(f"Request body: {await request.body()}")
    print(f"Errors: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body},
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
            "reels": "/api/reels"
        }
    }


if __name__ == "__main__":
    import uvicorn
    # Run server via import string to enable reload when running this script
    # From project root run: `python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 5000`
    uvicorn.run("backend.main:app", host="127.0.0.1", port=5000, reload=True)
