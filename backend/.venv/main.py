from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, photographers, booking, cnic, chat

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth.router, prefix="/api")
app.include_router(photographers.router, prefix="/api")
app.include_router(booking.router, prefix="/api")
app.include_router(cnic.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

@app.get("/")
def root():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    # Run server directly: python backend/.venv/main.py
    uvicorn.run(app, host="127.0.0.1", port=5000, reload=True)
