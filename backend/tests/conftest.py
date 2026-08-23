import sys
from pathlib import Path

# backend/ 자체를 패키지로 설치하지 않고 바로 `pytest`로 돌릴 수 있도록 backend/를 sys.path에 추가한다.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest_asyncio  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.models import Base  # noqa: E402


@pytest_asyncio.fixture
async def db_session():
    # 파일 대신 메모리 SQLite를 쓰되, 커넥션을 하나만 유지해야(StaticPool) 테스트 중간에
    # 인메모리 DB가 사라지지 않는다. 실제 Settings.database_url(로컬 파일)과는 무관하다.
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()
