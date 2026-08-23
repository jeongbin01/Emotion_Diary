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

    with TestClient(app) as test_client:
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
