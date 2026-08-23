import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user_repository import UserRepository


async def test_create_persists_a_user_with_the_given_email_and_hash(db_session: AsyncSession):
    repo = UserRepository(db_session)

    user = await repo.create(email="user@example.com", hashed_password="hashed-value")

    assert user.id is not None
    assert user.email == "user@example.com"
    assert user.hashed_password == "hashed-value"


async def test_get_by_email_finds_an_existing_user(db_session: AsyncSession):
    repo = UserRepository(db_session)
    await repo.create(email="user@example.com", hashed_password="hashed-value")

    found = await repo.get_by_email("user@example.com")

    assert found is not None
    assert found.email == "user@example.com"


async def test_get_by_email_returns_none_for_an_unknown_email(db_session: AsyncSession):
    repo = UserRepository(db_session)

    found = await repo.get_by_email("nobody@example.com")

    assert found is None


async def test_get_by_id_finds_an_existing_user(db_session: AsyncSession):
    repo = UserRepository(db_session)
    created = await repo.create(email="user@example.com", hashed_password="hashed-value")

    found = await repo.get_by_id(created.id)

    assert found is not None
    assert found.id == created.id


async def test_get_by_id_returns_none_for_a_missing_user(db_session: AsyncSession):
    repo = UserRepository(db_session)

    found = await repo.get_by_id(uuid.uuid4())

    assert found is None
