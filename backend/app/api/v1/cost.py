from fastapi import APIRouter

from app.services import cost_tracking

router = APIRouter(prefix="/cost", tags=["cost"])


@router.get("/stats")
async def get_cost_stats() -> dict:
    # 서버 프로세스가 떠 있는 동안 누적된 실제 Gemini 사용량/비용 통계. app/api/cost/route.ts와
    # 동일한 인메모리 집계 — 재시작하면 초기화된다(§19 참고).
    return cost_tracking.get_cost_stats()
