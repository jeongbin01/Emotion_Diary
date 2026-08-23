import os
import sys
import tempfile
from pathlib import Path

# backend/ 자체를 패키지로 설치하지 않고 바로 `pytest`로 돌릴 수 있도록 backend/를 sys.path에 추가한다.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# app.main을 import하기 전에 DATABASE_URL을 임시 파일로 지정해, 테스트가 로컬 개발 DB
# (emotion_diary.db)를 건드리지 않게 한다.
os.environ.setdefault(
    "DATABASE_URL", f"sqlite+aiosqlite:///{tempfile.NamedTemporaryFile(suffix='.db', delete=False).name}"
)

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def _app():
    from app.main import app

    # raise_server_exceptions=False: 전역 예외 핸들러가 실제로 만든 HTTP 응답(500)을 테스트에서
    # 검증하기 위함 — 기본값(True)이면 TestClient가 핸들러 결과 대신 원본 예외를 다시 던진다.
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield app, test_client


@pytest.fixture()
def client(_app):
    # 세션당 한 번만 lifespan(모델 워밍업)을 태우고, 요청별로 매번 새 TestClient를 만들지 않는다 —
    # dependency_overrides와 rate limiter 상태만 테스트마다 초기화한다.
    from app.core.rate_limit import limiter

    app, test_client = _app
    limiter.reset()
    yield test_client
    app.dependency_overrides.clear()
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
