import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.diary_repository import DiaryRepository
from app.schemas.diary import DiaryCreateRequest, DiaryOut
from app.services.emotion_analysis import EmotionAnalysisService, get_emotion_analysis_service

router = APIRouter(prefix="/diaries", tags=["diaries"])


@router.post("", response_model=DiaryOut, status_code=201)
async def create_diary(
    payload: DiaryCreateRequest,
    db: AsyncSession = Depends(get_db),
    service: EmotionAnalysisService = Depends(get_emotion_analysis_service),
) -> DiaryOut:
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="텍스트를 입력해주세요.")

    # KcBERT/FastText 추론(CPU 바운드)과 Gemini 호출(네트워크 I/O)이 섞여 있어, 이벤트 루프를
    # 막지 않도록 스레드풀에 위임한다 — §9 "왜 async인가"에서 설계한 run_in_executor 패턴.
    outcome = await asyncio.to_thread(service.analyze, text)

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
