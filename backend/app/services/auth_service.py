from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class AuthService:
    def __init__(self, session: AsyncSession):
        self._session = session
        self._users = UserRepository(session)

    async def signup(self, email: str, password: str) -> User:
        existing = await self._users.get_by_email(email)
        if existing is not None:
            raise EmailAlreadyRegisteredError(email)

        try:
            return await self._users.create(email=email, hashed_password=hash_password(password))
        except IntegrityError as exc:
            # get_by_email 이후 커밋 사이에 동시에 같은 이메일로 가입한 경우를 대비한 안전망.
            await self._session.rollback()
            raise EmailAlreadyRegisteredError(email) from exc

    async def login(self, email: str, password: str) -> str:
        user = await self._users.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            # 이메일 존재 여부를 노출하지 않도록 두 실패 사유를 동일한 예외로 합친다.
            raise InvalidCredentialsError()

        return create_access_token(subject=str(user.id))
