from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserOut
from app.services.auth_service import AuthService, EmailAlreadyRegisteredError, InvalidCredentialsError

router = APIRouter(prefix="/auth", tags=["인증"])


@router.post("/signup", response_model=UserOut, status_code=201, summary="회원가입", description="이메일과 비밀번호로 새 계정을 생성합니다.")
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)) -> UserOut:
    service = AuthService(db)
    try:
        user = await service.signup(payload.email, payload.password)
    except EmailAlreadyRegisteredError:
        raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다.")
    return UserOut.model_validate(user)


@router.post("/login", response_model=TokenResponse, summary="로그인", description="이메일과 비밀번호를 확인한 뒤 인증용 접근 토큰을 발급합니다.")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    service = AuthService(db)
    try:
        token = await service.login(payload.email, payload.password)
    except InvalidCredentialsError:
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut, summary="내 정보 조회", description="Bearer 토큰으로 인증된 현재 사용자 정보를 조회합니다.")
async def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)
