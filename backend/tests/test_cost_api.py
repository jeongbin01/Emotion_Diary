import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1 import cost
from app.services import cost_tracking


@pytest.fixture(autouse=True)
def reset_stats():
    # 모듈 전역 인메모리 집계라 테스트 간에 값이 새면 순서에 따라 결과가 달라진다.
    cost_tracking.reset_cost_stats()
    yield
    cost_tracking.reset_cost_stats()


def make_app() -> FastAPI:
    app = FastAPI()
    app.include_router(cost.router, prefix="/api/v1")
    return app


def test_cost_stats_defaults_to_zero_before_any_requests():
    client = TestClient(make_app())

    response = client.get("/api/v1/cost/stats")

    assert response.status_code == 200
    body = response.json()
    assert body["requestCount"] == 0
    assert body["totalCostUSD"] == 0
    assert body["avgCostPerRequestUSD"] == 0
    assert body["fasttextTrafficShare"] == 0


def test_cost_stats_reflects_recorded_gemini_and_fasttext_usage():
    cost_tracking.record_gemini_request(input_tokens=269, output_tokens=344)
    cost_tracking.record_fasttext_request()

    client = TestClient(make_app())
    response = client.get("/api/v1/cost/stats")

    body = response.json()
    assert body["requestCount"] == 2
    assert body["geminiRequestCount"] == 1
    assert body["fasttextRequestCount"] == 1
    assert body["totalInputTokens"] == 269
    assert body["totalOutputTokens"] == 344
    assert round(body["totalCostUSD"], 6) == 0.000941
    assert body["fasttextTrafficShare"] == 0.5
