from fastapi import APIRouter

router = APIRouter(prefix="/photographers", tags=["Photographers"])

@router.get("/")
def list_photographers():
    return {"msg": "list photographers"}

@router.get("/{photographer_id}")
def get_photographer(photographer_id: str):
    return {"msg": f"profile for {photographer_id}"}
