import logging
from dataclasses import dataclass

import pytest

from app.services.ai.gemini_client import GeminiClientError
from app.services.emotion_analysis import EmotionAnalysisService

SERVICE_LOGGER = "app.services.emotion_analysis"


class FakeKcBert:
    def predict(self, text: str) -> dict:
        return {
            "label": "긍정",
            "confidence": 0.9,
            "emotions": [
                {"label": "긍정", "score": 0.9},
                {"label": "중립", "score": 0.08},
                {"label": "부정", "score": 0.02},
            ],
        }


class FakeFastText:
    def predict(self, text: str) -> list[dict]:
        return [{"label": "행복", "score": 0.8}, {"label": "감사", "score": 0.5}]


@dataclass
class FakeSettings:
    emotion_engine: str = "gemini"
    gemini_traffic_ratio: float = 1.0
    gemini_api_key: str | None = "fake-key"


def _unexpected_gemini_call(*args, **kwargs):
    raise AssertionError("Gemini는 호출되면 안 되는 경로에서 호출되었다")


def make_service(
    engine="gemini", ratio=1.0, api_key="fake-key", gemini_classify=_unexpected_gemini_call, random_fn=lambda: 0.0
):
    return EmotionAnalysisService(
        kcbert=FakeKcBert(),
        fasttext=FakeFastText(),
        gemini_classify=gemini_classify,
        random_fn=random_fn,
        settings_override=FakeSettings(emotion_engine=engine, gemini_traffic_ratio=ratio, gemini_api_key=api_key),
    )


def test_emotion_engine_fasttext_forces_local_path_without_calling_gemini():
    service = make_service(engine="fasttext", ratio=1.0)
    outcome = service.analyze("오늘은 정말 좋은 하루였다")

    assert outcome.engine == "fasttext"
    assert outcome.result["label"] == "행복"
    assert outcome.cost_usd == 0


def test_traffic_ratio_zero_routes_every_request_to_fasttext():
    # random_fn이 항상 0.5를 반환해도 ratio=0이면 0.5 >= 0이 항상 참이라 FastText로만 간다.
    service = make_service(ratio=0.0, random_fn=lambda: 0.5)
    outcome = service.analyze("텍스트")
    assert outcome.engine == "fasttext"


def test_traffic_ratio_one_always_attempts_gemini():
    calls = []

    def fake_gemini(text, base_label, api_key):
        calls.append((text, base_label, api_key))
        raise GeminiClientError("네트워크 실패 흉내")

    service = make_service(ratio=1.0, random_fn=lambda: 0.999, gemini_classify=fake_gemini)
    outcome = service.analyze("텍스트")

    assert len(calls) == 1
    assert outcome.engine == "fasttext"  # Gemini가 실패했으니 폴백


def test_missing_api_key_falls_back_to_fasttext_without_calling_gemini():
    service = make_service(ratio=1.0, api_key=None, random_fn=lambda: 0.0)
    outcome = service.analyze("텍스트")
    assert outcome.engine == "fasttext"


def test_gemini_success_path_records_tokens_and_cost():
    class Parsed:
        class Label:
            value = "행복"

        label = Label()
        confidence = 0.95
        emotions = []
        aiOneLiner = "오늘은 행복한 하루였어요."
        aiMessage = "행복한 하루를 보내셨네요."
        causes = []
        keywords = ["산책"]
        mindState = "안정적인 하루."
        growthPoint = "성장 포인트."
        tomorrowMessage = "내일도 화이팅."
        activities = []
        quote = "오늘도 수고했어요."

    @dataclass
    class FakeGeminiCallResult:
        parsed: object
        input_tokens: int
        output_tokens: int

    def fake_gemini(text, base_label, api_key):
        return FakeGeminiCallResult(parsed=Parsed(), input_tokens=269, output_tokens=344)

    service = make_service(ratio=1.0, random_fn=lambda: 0.0, gemini_classify=fake_gemini)
    outcome = service.analyze("텍스트")

    assert outcome.engine == "gemini"
    assert outcome.input_tokens == 269
    assert outcome.output_tokens == 344
    assert outcome.cost_usd > 0
    assert outcome.result["label"] == "행복"


@pytest.mark.parametrize("ratio", [-0.5, 1.5])
def test_traffic_ratio_is_clamped_to_0_1(ratio):
    # Settings에 잘못된 비율(범위 밖)이 들어와도 서비스가 0~1로 clamp해서 처리해야 한다.
    # ratio=-0.5 -> clamp 0 -> 0.5 >= 0 항상 True -> fasttext (Gemini 호출 안 됨)
    # ratio=1.5  -> clamp 1 -> 0.5 >= 1 항상 False -> gemini 시도(여기서는 실패를 흉내내 폴백 확인)
    def failing_gemini(text, base_label, api_key):
        raise GeminiClientError("네트워크 실패 흉내")

    service = make_service(ratio=ratio, random_fn=lambda: 0.5, gemini_classify=failing_gemini)
    outcome = service.analyze("텍스트")
    assert outcome.engine == "fasttext"


def test_gemini_failure_logs_a_warning_before_falling_back(caplog):
    def failing_gemini(text, base_label, api_key):
        raise GeminiClientError("네트워크 실패 흉내")

    service = make_service(ratio=1.0, random_fn=lambda: 0.0, gemini_classify=failing_gemini)

    with caplog.at_level(logging.WARNING, logger=SERVICE_LOGGER):
        service.analyze("텍스트")

    assert any("Gemini" in r.message and "폴백" in r.message for r in caplog.records)


def test_missing_api_key_logs_info_before_falling_back(caplog):
    service = make_service(ratio=1.0, api_key=None, random_fn=lambda: 0.0)

    with caplog.at_level(logging.INFO, logger=SERVICE_LOGGER):
        service.analyze("텍스트")

    assert any("API_KEY 미설정" in r.message for r in caplog.records)
