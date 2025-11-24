from fastapi import APIRouter

router = APIRouter(prefix="/booking", tags=["Booking"])

@router.post("/")
def create_booking():
    return {"msg": "create booking"}

@router.get("/client/{client_id}")
def client_bookings(client_id: str):
    return {"msg": f"bookings for client {client_id}"}

@router.get("/photographer/{photographer_id}")
def photographer_bookings(photographer_id: str):
    return {"msg": f"bookings for photographer {photographer_id}"}
