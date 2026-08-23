from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import auth
from app.core.security import create_access_token
from app.db.session import get_db


def make_app(session: AsyncSession) -> FastAPI:
    app = FastAPI()
    app.include_router(auth.router, prefix="/api/v1")
    app.dependency_overrides[get_db] = lambda: session
    return app


def test_signup_returns_201_and_never_echoes_the_password(db_session: AsyncSession):
    client = TestClient(make_app(db_session))

    response = client.post("/api/v1/auth/signup", json={"email": "user@example.com", "password": "password123"})

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "user@example.com"
    assert "password" not in body
    assert "hashedPassword" not in body


def test_signup_rejects_too_short_a_password_with_422(db_session: AsyncSession):
    client = TestClient(make_app(db_session))

    response = client.post("/api/v1/auth/signup", json={"email": "user@example.com", "password": "short"})

    assert response.status_code == 422


def test_signup_with_a_duplicate_email_returns_409(db_session: AsyncSession):
    client = TestClient(make_app(db_session))
    client.post("/api/v1/auth/signup", json={"email": "user@example.com", "password": "password123"})

    response = client.post("/api/v1/auth/signup", json={"email": "user@example.com", "password": "password456"})

    assert response.status_code == 409


def test_login_with_correct_credentials_returns_a_bearer_token(db_session: AsyncSession):
    client = TestClient(make_app(db_session))
    client.post("/api/v1/auth/signup", json={"email": "user@example.com", "password": "password123"})

    response = client.post("/api/v1/auth/login", json={"email": "user@example.com", "password": "password123"})

    assert response.status_code == 200
    body = response.json()
    assert body["tokenType"] == "bearer"
    assert body["accessToken"]


def test_login_with_wrong_password_returns_401(db_session: AsyncSession):
    client = TestClient(make_app(db_session))
    client.post("/api/v1/auth/signup", json={"email": "user@example.com", "password": "password123"})

    response = client.post("/api/v1/auth/login", json={"email": "user@example.com", "password": "wrong-password"})

    assert response.status_code == 401


def test_me_without_a_token_returns_401(db_session: AsyncSession):
    client = TestClient(make_app(db_session))

    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_me_with_an_invalid_token_returns_401(db_session: AsyncSession):
    client = TestClient(make_app(db_session))

    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"})

    assert response.status_code == 401


async def test_me_with_a_valid_token_returns_the_current_user(db_session: AsyncSession):
    client = TestClient(make_app(db_session))
    signup_res = client.post(
        "/api/v1/auth/signup", json={"email": "user@example.com", "password": "password123"}
    )
    token = create_access_token(subject=signup_res.json()["id"])

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["email"] == "user@example.com"
