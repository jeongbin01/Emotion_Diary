import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Diary(Base):
    __tablename__ = "diaries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Phase 1에는 로그인 기능이 없어 nullable로 둔다. Phase 2에서 인증이 붙으면
    # NOT NULL로 좁히는 마이그레이션을 추가한다 (docs/PORTFOLIO_REDESIGN.md §11 ERD 참고).
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User | None"] = relationship(back_populates="diaries")
    emotion_analysis: Mapped["EmotionAnalysis"] = relationship(
        back_populates="diary", uselist=False, cascade="all, delete-orphan"
    )
