import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token, verify_password
from app.services.auth_service import AuthService, EmailAlreadyRegisteredError, InvalidCredentialsError


async def test_signup_creates_a_user_with_a_hashed_password(db_session: AsyncSession):
    service = AuthService(db_session)

    user = await service.signup("user@example.com", "password123")

    assert user.email == "user@example.com"
    assert user.hashed_password != "password123"
    assert verify_password("password123", user.hashed_password)


async def test_signup_rejects_a_duplicate_email(db_session: AsyncSession):
    service = AuthService(db_session)
    await service.signup("user@example.com", "password123")

    with pytest.raises(EmailAlreadyRegisteredError):
        await service.signup("user@example.com", "another-password")


async def test_login_returns_a_valid_token_for_correct_credentials(db_session: AsyncSession):
    service = AuthService(db_session)
    user = await service.signup("user@example.com", "password123")

    token = await service.login("user@example.com", "password123")

    assert decode_access_token(token) == str(user.id)


async def test_login_rejects_a_wrong_password(db_session: AsyncSession):
    service = AuthService(db_session)
    await service.signup("user@example.com", "password123")

    with pytest.raises(InvalidCredentialsError):
        await service.login("user@example.com", "wrong-password")


async def test_login_rejects_an_unregistered_email(db_session: AsyncSession):
    service = AuthService(db_session)

    with pytest.raises(InvalidCredentialsError):
        await service.login("nobody@example.com", "password123")
