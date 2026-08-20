import logging
import uuid

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.diary import Diary
from app.models.emotion_analysis import EmotionAnalysis
from app.services.emotion_analysis import AnalysisOutcome

logger = logging.getLogger(__name__)


class DiaryRepository:
    """일기/분석 결과에 대한 SQLAlchemy 쿼리 캡슐화 계층."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def create_with_analysis(
        self, content: str, outcome: AnalysisOutcome, user_id: uuid.UUID | None = None
    ) -> Diary:
        diary = Diary(content=content, user_id=user_id)
        diary.emotion_analysis = EmotionAnalysis(
            engine=outcome.engine,
            input_tokens=outcome.input_tokens,
            output_tokens=outcome.output_tokens,
            cost_usd=outcome.cost_usd,
            processing_time_ms=outcome.processing_time_ms,
            **outcome.result,
        )
        self._session.add(diary)
        try:
            await self._session.commit()
        except SQLAlchemyError:
            logger.exception("일기 저장 실패")
            raise
        await self._session.refresh(diary, attribute_names=["emotion_analysis"])
        return diary

    async def list_recent(self, limit: int = 20, user_id: uuid.UUID | None = None) -> list[Diary]:
        stmt = (
            select(Diary)
            .options(selectinload(Diary.emotion_analysis))
            .order_by(Diary.created_at.desc())
            .limit(limit)
        )
        if user_id is not None:
            stmt = stmt.where(Diary.user_id == user_id)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, diary_id: uuid.UUID) -> Diary | None:
        stmt = (
            select(Diary)
            .options(selectinload(Diary.emotion_analysis))
            .where(Diary.id == diary_id)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()
