from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> parents[2] == backend/, parents[3] == 저장소 루트.
REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = REPO_ROOT / "backend"


class Settings(BaseSettings):
    # Local development keeps the shared Gemini key in the repository root's
    # .env.local.  A backend/.env file can still override it for deployments.
    model_config = SettingsConfigDict(
        env_file=(str(REPO_ROOT / ".env.local"), str(BACKEND_ROOT / ".env")),
        extra="ignore",
    )

    database_url: str = f"sqlite+aiosqlite:///{(BACKEND_ROOT / 'emotion_diary.db').as_posix()}"

    log_level: str = "INFO"
    # KcBERT/FastText/Gemini 전체 분석 파이프라인(diaries.py의 asyncio.to_thread) 타임아웃(초).
    analysis_timeout_seconds: float = 30.0
    # POST /api/v1/diaries에 대한 IP당 분당 허용 요청 수. 로그인 기반 인증이 아직 없어 IP 기준으로 제한한다.
    rate_limit_per_minute: int = 10

    gemini_api_key: str | None = None
    # 0~1. 1(기본값)이면 항상 Gemini를 시도하고, 0이면 API 키가 있어도 FastText 로컬 경로로만
    # 처리해 비용을 0으로 수렴시킨다. Next.js 버전의 GEMINI_TRAFFIC_RATIO와 동일한 스위치.
    gemini_traffic_ratio: float = 1.0
    # "fasttext"로 두면 gemini_traffic_ratio와 무관하게 항상 로컬 경로만 사용한다.
    emotion_engine: str = "gemini"

    kcbert_model_path: str = str(BACKEND_ROOT / "models" / "kcbert")
    fasttext_model_path: str = str(BACKEND_ROOT / "models" / "fasttext" / "emotion_ft.bin")

    @property
    def sync_database_url(self) -> str:
        # Alembic은 동기 드라이버로 마이그레이션을 돌린다. asyncpg/aiosqlite 접두어만 제거하면
        # 같은 DSN을 동기 드라이버로도 그대로 쓸 수 있다.
        return self.database_url.replace("+aiosqlite", "").replace("+asyncpg", "")

    @property
    def clamped_gemini_traffic_ratio(self) -> float:
        return min(1.0, max(0.0, self.gemini_traffic_ratio))


settings = Settings()
