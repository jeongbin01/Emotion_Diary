from fastapi import APIRouter

from app.services import cost_tracking

router = APIRouter(prefix="/cost", tags=["cost"])


@router.get("/stats")
async def get_cost_stats() -> dict:
    # 인메모리 집계라 서버 재시작 시 초기화된다.
    return cost_tracking.get_cost_stats()
