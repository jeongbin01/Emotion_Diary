import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.diary import Diary
from app.models.emotion_analysis import EmotionAnalysis
from app.services.emotion_analysis import AnalysisOutcome


class DiaryRepository:
    """SQLAlchemy 쿼리를 캡슐화한다. Service는 "일기와 분석 결과를 저장해달라"고만 요청하고,
    실제 INSERT/조인/정렬은 여기서 담당한다 — docs/TECHNICAL_DETAILS.md §9의 3계층 분리."""

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
        await self._session.commit()
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
