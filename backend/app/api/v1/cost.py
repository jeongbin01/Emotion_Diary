from fastapi import APIRouter

from app.services import cost_tracking

router = APIRouter(prefix="/cost", tags=["비용"])


@router.get("/stats", summary="AI 분석 비용 통계", description="현재 서버에서 집계한 AI 분석 API 사용량과 비용을 조회합니다.")
async def get_cost_stats() -> dict:
    # 인메모리 집계라 서버 재시작 시 초기화된다.
    return cost_tracking.get_cost_stats()
