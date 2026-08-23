import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

<<<<<<< HEAD
from app.api.v1 import auth, cost, diaries
from app.core.config import settings
from app.core.logging import setup_logging
from app.core.rate_limit import limiter
=======
from app.api.v1 import auth, cost, diaries
>>>>>>> feature/authentication
from app.db.session import engine
from app.models import Base
from app.services.ai.fasttext_classifier import get_fasttext_classifier
from app.services.ai.kcbert import get_kcbert_classifier

setup_logging(settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    # KcBERT(~415MB)/FastText(~2.4MB) 모델을 부팅 시 한 번만 메모리에 올린다 — 요청마다 모델을
    # 새로 로딩하는 비용을 없앤다.
    start = time.perf_counter()
    get_kcbert_classifier()
    get_fasttext_classifier()
    logger.info("모델 워밍업 완료 (%.2fs)", time.perf_counter() - start)
    yield


app = FastAPI(
    title="오늘의 하루 API",
    description="KcBERT + FastText + Gemini 하이브리드 감정 분석 백엔드 (FastAPI, Phase 1)",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = int((time.perf_counter() - start) * 1000)
    logger.info(
        "%s %s -> %d (%dms)", request.method, request.url.path, response.status_code, duration_ms
    )
    return response


app.include_router(diaries.router, prefix="/api/v1")
app.include_router(cost.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
