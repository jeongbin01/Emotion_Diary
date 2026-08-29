import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1 import auth, cost, diaries
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

    start = time.perf_counter()
    get_kcbert_classifier()
    get_fasttext_classifier()
    logger.info("모델 준비 완료 (%.2fs)", time.perf_counter() - start)
    yield


app = FastAPI(
    title="오늘의 하루 API",
    description="감정 일기 분석 서비스의 백엔드 API입니다. 로그인 후 일기를 작성하고 분석 결과를 조회할 수 있습니다.",
    version="1.0.0",
    openapi_tags=[
        {"name": "인증", "description": "회원가입, 로그인 및 현재 사용자 정보를 관리합니다."},
        {"name": "일기", "description": "감정 분석이 포함된 일기를 작성하고 조회합니다."},
        {"name": "비용", "description": "AI 분석 API 사용 비용 통계를 조회합니다."},
    ],
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
    logger.info("%s %s -> %d (%dms)", request.method, request.url.path, response.status_code, duration_ms)
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("처리하지 못한 예외: %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "서버 오류가 발생했습니다."})


app.include_router(diaries.router, prefix="/api/v1")
app.include_router(cost.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")


@app.get("/health", tags=["상태 확인"], summary="서버 상태 확인", description="서버가 정상적으로 실행 중인지 확인합니다.")
async def health() -> dict:
    return {"status": "ok"}
