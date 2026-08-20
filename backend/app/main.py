import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1 import cost, diaries
from app.core.config import settings
from app.core.logging import setup_logging
from app.core.rate_limit import limiter
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


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # HTTPException(400/404 등)은 FastAPI 기본 핸들러가 그대로 처리하므로 여기까지 오지 않는다.
    # 여기 도달하는 예외는 전부 예상치 못한 실패라, 스택트레이스를 남기고 내부 정보는 노출하지 않는다.
    logger.exception("처리되지 않은 예외: %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "서버 오류가 발생했습니다."})


app.include_router(diaries.router, prefix="/api/v1")
app.include_router(cost.router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
