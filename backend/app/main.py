from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import cost, diaries
from app.services.ai.fasttext_classifier import get_fasttext_classifier
from app.services.ai.kcbert import get_kcbert_classifier


@asynccontextmanager
async def lifespan(app: FastAPI):
    # KcBERT(~415MB)/FastText(~2.4MB) 모델을 부팅 시 한 번만 메모리에 올린다. Next.js 버전의
    # instrumentation.ts가 자식 프로세스를 예열하던 것과 같은 목적이지만, 여기서는 프로세스
    # 경계가 없어 함수 호출 하나로 끝난다(§7 "이 아키텍처의 핵심").
    get_kcbert_classifier()
    get_fasttext_classifier()
    yield


app = FastAPI(
    title="오늘의 하루 API",
    description="KcBERT + FastText + Gemini 하이브리드 감정 분석 백엔드 (FastAPI, Phase 1)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(diaries.router, prefix="/api/v1")
app.include_router(cost.router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
