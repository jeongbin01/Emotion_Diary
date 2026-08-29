import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel


class SignupRequest(BaseModel):
    email: EmailStr = Field(description="회원가입에 사용할 이메일 주소")
    password: str = Field(min_length=8, max_length=128, description="8자 이상 128자 이하의 비밀번호")


class LoginRequest(BaseModel):
    email: EmailStr = Field(description="가입한 이메일 주소")
    password: str = Field(description="계정 비밀번호")


class UserOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: uuid.UUID = Field(description="사용자 고유 ID")
    email: str = Field(description="사용자 이메일 주소")
    created_at: datetime = Field(description="가입 일시")


class TokenResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    access_token: str = Field(description="인증이 필요한 요청에 사용할 접근 토큰")
    token_type: str = Field(default="bearer", description="토큰 인증 방식")
