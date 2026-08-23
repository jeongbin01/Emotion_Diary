import uuid
from datetime import timedelta

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.models import Base
from app.repositories.diary_repository import DiaryRepository
from app.services.emotion_analysis import AnalysisOutcome, create_local_detailed_result


@pytest_asyncio.fixture
async def session():
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
    async with session_factory() as db_session:
        yield db_session

    await engine.dispose()


def make_outcome(engine: str = "fasttext") -> AnalysisOutcome:
    result = create_local_detailed_result(
        base_label="행복",
        base_confidence=0.9,
        base_emotions=[{"label": "행복", "score": 0.9}],
        detailed_emotions=[{"label": "행복", "score": 0.8}],
    )
    return AnalysisOutcome(result=result, engine=engine)


async def test_create_with_analysis_persists_diary_and_its_analysis(session: AsyncSession):
    repo = DiaryRepository(session)

    diary = await repo.create_with_analysis(content="오늘은 좋은 하루였다", outcome=make_outcome())

    assert diary.id is not None
    assert diary.content == "오늘은 좋은 하루였다"
    assert diary.emotion_analysis is not None
    assert diary.emotion_analysis.engine == "fasttext"
    assert diary.emotion_analysis.label == "행복"


async def test_get_by_id_returns_the_created_diary_with_its_analysis(session: AsyncSession):
    repo = DiaryRepository(session)
    created = await repo.create_with_analysis(content="일기 내용", outcome=make_outcome())

    fetched = await repo.get_by_id(created.id)

    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.emotion_analysis.label == "행복"


async def test_get_by_id_returns_none_for_a_missing_diary(session: AsyncSession):
    repo = DiaryRepository(session)

    fetched = await repo.get_by_id(uuid.uuid4())

    assert fetched is None


async def test_list_recent_orders_newest_first(session: AsyncSession):
    repo = DiaryRepository(session)
    first = await repo.create_with_analysis(content="첫 번째 일기", outcome=make_outcome())
    second = await repo.create_with_analysis(content="두 번째 일기", outcome=make_outcome())

    # 두 커밋이 같은 마이크로초에 끝나 created_at이 우연히 같아지면 정렬 검증이 흔들리므로,
    # ORDER BY 절 자체를 검증하려는 의도에 맞게 생성 시각을 명시적으로 벌려 둔다.
    second.created_at = first.created_at + timedelta(seconds=1)
    await session.commit()

    diaries = await repo.list_recent(limit=10)

    assert [d.id for d in diaries] == [second.id, first.id]


async def test_list_recent_respects_the_limit(session: AsyncSession):
    repo = DiaryRepository(session)
    for i in range(3):
        await repo.create_with_analysis(content=f"일기 {i}", outcome=make_outcome())

    diaries = await repo.list_recent(limit=2)

    assert len(diaries) == 2


async def test_list_recent_only_returns_the_given_users_diaries(session: AsyncSession):
    repo = DiaryRepository(session)
    user_id = uuid.uuid4()
    other_user_id = uuid.uuid4()
    await repo.create_with_analysis(content="내 일기", outcome=make_outcome(), user_id=user_id)
    await repo.create_with_analysis(content="다른 사람 일기", outcome=make_outcome(), user_id=other_user_id)

    diaries = await repo.list_recent(limit=10, user_id=user_id)

    assert [d.content for d in diaries] == ["내 일기"]
