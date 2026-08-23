import asyncio

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.repositories.diary_repository import DiaryRepository
from app.schemas.diary import DiaryCreateRequest, DiaryOut
from app.services.emotion_analysis import EmotionAnalysisService, get_emotion_analysis_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/diaries", tags=["diaries"])


@router.post("", response_model=DiaryOut, status_code=201)
@limiter.limit(lambda: f"{settings.rate_limit_per_minute}/minute")
async def create_diary(
    request: Request,
    payload: DiaryCreateRequest,
    db: AsyncSession = Depends(get_db),
    service: EmotionAnalysisService = Depends(get_emotion_analysis_service),
) -> DiaryOut:
    text = payload.text.strip()
    if not text:
        logger.warning("빈 텍스트로 일기 생성 요청 (client=%s)", request.client.host if request.client else "?")
        raise HTTPException(status_code=400, detail="텍스트를 입력해주세요.")

    # KcBERT/FastText 추론(CPU 바운드)과 Gemini 호출(네트워크 I/O)이 섞여 있어, 이벤트 루프를
    # 막지 않도록 스레드풀에 위임한다. 전체를 wait_for로 감싸 파이프라인이 비정상적으로 오래
    # 걸리는 경우(모델 추론 지연 포함) 요청이 무한정 붙잡히지 않도록 한다.
    try:
        outcome = await asyncio.wait_for(
            asyncio.to_thread(service.analyze, text), timeout=settings.analysis_timeout_seconds
        )
    except asyncio.TimeoutError:
        logger.error("감정 분석 타임아웃 (%.0fs 초과)", settings.analysis_timeout_seconds)
        raise HTTPException(status_code=504, detail="분석이 너무 오래 걸려 중단했습니다. 잠시 후 다시 시도해주세요.")

    repo = DiaryRepository(db)
    diary = await repo.create_with_analysis(content=text, outcome=outcome)
    return DiaryOut.model_validate(diary)


@router.get("", response_model=list[DiaryOut])
async def list_diaries(limit: int = 20, db: AsyncSession = Depends(get_db)) -> list[DiaryOut]:
    repo = DiaryRepository(db)
    diaries = await repo.list_recent(limit=limit)
    return [DiaryOut.model_validate(diary) for diary in diaries]


@router.get("/{diary_id}", response_model=DiaryOut)
async def get_diary(diary_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> DiaryOut:
    repo = DiaryRepository(db)
    diary = await repo.get_by_id(diary_id)
    if diary is None:
        raise HTTPException(status_code=404, detail="일기를 찾을 수 없습니다.")
    return DiaryOut.model_validate(diary)
