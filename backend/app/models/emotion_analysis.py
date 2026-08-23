import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

# SQLite(로컬 개발)에는 JSONB가 없으므로, Postgres에서만 JSONB를 쓰고 그 외엔 JSON으로 폴백한다.
JsonColumn = JSON().with_variant(JSONB, "postgresql")


class EmotionAnalysis(Base):
    __tablename__ = "emotion_analyses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    diary_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("diaries.id", ondelete="CASCADE"), unique=True
    )

    label: Mapped[str] = mapped_column(String(32))
    confidence: Mapped[float] = mapped_column(Float)
    emotions: Mapped[list] = mapped_column(JsonColumn)
    detailed_emotions: Mapped[list] = mapped_column(JsonColumn)
    ai_one_liner: Mapped[str] = mapped_column(Text)
    ai_message: Mapped[str] = mapped_column(Text)
    causes: Mapped[list] = mapped_column(JsonColumn)
    keywords: Mapped[list] = mapped_column(JsonColumn)
    mind_state: Mapped[str] = mapped_column(Text)
    growth_point: Mapped[str] = mapped_column(Text)
    tomorrow_message: Mapped[str] = mapped_column(Text)
    activities: Mapped[list] = mapped_column(JsonColumn)
    quote: Mapped[str] = mapped_column(Text)

    # AI 비용/성능을 시간에 따라 관측하기 위한 필드.
    engine: Mapped[str] = mapped_column(String(16))
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Numeric(12, 8), default=0)
    processing_time_ms: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    diary: Mapped["Diary"] = relationship(back_populates="emotion_analysis")
