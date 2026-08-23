import time

import jwt
import pytest

from app.core import security
from app.core.security import (
    InvalidTokenError,
    JWT_ALGORITHM,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_password_does_not_store_the_plaintext():
    hashed = hash_password("super-secret-password")
    assert hashed != "super-secret-password"


def test_verify_password_accepts_the_correct_password():
    hashed = hash_password("super-secret-password")
    assert verify_password("super-secret-password", hashed) is True


def test_verify_password_rejects_a_wrong_password():
    hashed = hash_password("super-secret-password")
    assert verify_password("wrong-password", hashed) is False


def test_create_and_decode_access_token_roundtrip():
    token = create_access_token(subject="user-123")
    assert decode_access_token(token) == "user-123"


def test_decode_access_token_rejects_a_tampered_token():
    token = create_access_token(subject="user-123")
    # base64url의 마지막 문자는 유효 비트가 일부뿐이라 끝 글자만 바꾸면 우연히 같은 바이트로
    # 디코딩될 수 있다 — 시그니처 세그먼트 중간 문자를 바꿔야 실제 바이트 변화가 보장된다.
    index = -6
    flipped = "a" if token[index] != "a" else "b"
    tampered = token[:index] + flipped + token[index + 1 :]

    with pytest.raises(InvalidTokenError):
        decode_access_token(tampered)


def test_decode_access_token_rejects_an_expired_token():
    expired_token = jwt.encode(
        {"sub": "user-123", "exp": int(time.time()) - 10},
        security.settings.jwt_secret,
        algorithm=JWT_ALGORITHM,
    )

    with pytest.raises(InvalidTokenError):
        decode_access_token(expired_token)


def test_decode_access_token_rejects_a_token_signed_with_a_different_secret():
    token = jwt.encode({"sub": "user-123"}, "a-completely-different-secret-value", algorithm=JWT_ALGORITHM)

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_decode_access_token_rejects_a_token_without_a_subject():
    token = jwt.encode({}, security.settings.jwt_secret, algorithm=JWT_ALGORITHM)

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)
