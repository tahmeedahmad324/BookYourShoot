# Package initializer for backend.routers
# Expose router modules so `from backend.routers import auth, photographers, booking, cnic, chat` works
from . import auth, photographers, booking, cnic

# chat router may not be implemented yet; import if present
try:
    from . import chat  # type: ignore
except Exception:
    chat = None
