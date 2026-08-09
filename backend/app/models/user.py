import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class User(Base):
    """§25 Phase 2(인증)에서 실제로 사용된다. Phase 1에서는 Diary.user_id가 nullable이라
    로그인 없이도 일기를 저장할 수 있고, 이 테이블은 스키마만 먼저 마련해둔 상태다."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    diaries: Mapped[list["Diary"]] = relationship(back_populates="user")
