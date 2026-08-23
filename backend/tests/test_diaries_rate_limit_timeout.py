import time

from app.core.config import settings
from app.main import app
from app.services.emotion_analysis import AnalysisOutcome, create_local_detailed_result, get_emotion_analysis_service


class _WorkingService:
    def analyze(self, text: str) -> AnalysisOutcome:
        result = create_local_detailed_result(
            base_label="긍정",
            base_confidence=0.9,
            base_emotions=[],
            detailed_emotions=[{"label": "행복", "score": 0.8}],
        )
        return AnalysisOutcome(result=result, engine="fasttext")


class _SlowService:
    def analyze(self, text: str) -> AnalysisOutcome:
        time.sleep(0.3)
        return AnalysisOutcome(result={}, engine="fasttext")


def test_analysis_timeout_returns_504(client, monkeypatch):
    monkeypatch.setattr(settings, "analysis_timeout_seconds", 0.05)
    app.dependency_overrides[get_emotion_analysis_service] = lambda: _SlowService()

    response = client.post("/api/v1/diaries", json={"text": "오늘은 힘든 하루였다"})

    assert response.status_code == 504


def test_rate_limit_exceeded_returns_429(client, monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_per_minute", 2)
    app.dependency_overrides[get_emotion_analysis_service] = lambda: _WorkingService()

    for _ in range(2):
        response = client.post("/api/v1/diaries", json={"text": "오늘은 좋은 하루였다"})
        assert response.status_code == 201

    response = client.post("/api/v1/diaries", json={"text": "오늘은 좋은 하루였다"})
    assert response.status_code == 429
