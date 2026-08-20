import logging
import random
import time
from dataclasses import dataclass, field
from typing import Callable, Protocol

from app.core.config import Settings, settings
from app.services import cost_tracking
from app.services.ai.fasttext_classifier import FastTextClassifier, get_fasttext_classifier
from app.services.ai.gemini_client import GeminiClientError, GeminiCallResult, classify_with_gemini
from app.services.ai.kcbert import KcBertClassifier, get_kcbert_classifier

logger = logging.getLogger(__name__)

FALLBACK_ACTIVITIES: dict[str, list[dict]] = {
    "긍정": [
        {"icon": "🎵", "label": "좋아하는 음악"},
        {"icon": "📞", "label": "소중한 사람과 통화"},
        {"icon": "🚶", "label": "산책 10분"},
        {"icon": "📝", "label": "오늘 기분 기록"},
    ],
    "중립": [
        {"icon": "🧘", "label": "스트레칭"},
        {"icon": "☕", "label": "따뜻한 차"},
        {"icon": "🚶", "label": "산책 10분"},
        {"icon": "📖", "label": "가벼운 독서"},
    ],
    "부정": [
        {"icon": "☕", "label": "따뜻한 차"},
        {"icon": "🌙", "label": "일찍 자기"},
        {"icon": "🚶", "label": "산책 10분"},
        {"icon": "🧘", "label": "스트레칭"},
    ],
}


class KcBertLike(Protocol):
    def predict(self, text: str) -> dict: ...


class FastTextLike(Protocol):
    def predict(self, text: str) -> list[dict]: ...


GeminiClassifyFn = Callable[[str, str, str], GeminiCallResult]


@dataclass
class AnalysisOutcome:
    result: dict
    engine: str
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    processing_time_ms: int = 0


def _resolve_polarity(label: str) -> str:
    return label if label in ("긍정", "부정") else "중립"


def create_local_detailed_result(
    base_label: str, base_confidence: float, base_emotions: list[dict], detailed_emotions: list[dict]
) -> dict:
    """Gemini를 호출하지 않는 저비용 경로. route.ts의 createLocalDetailedResult와 동일한 로직 —
    KcBERT(극성) + FastText(33종 세부 감정) 결과만으로 causes/mindState 같은 자유 서술형 필드를
    라벨 조합 템플릿으로 채운다. 과금은 0원."""
    polarity = _resolve_polarity(base_label)
    detailed = detailed_emotions[:5]
    top = detailed[0] if detailed else None
    top_label = top["label"] if top else base_label
    second_label = detailed[1]["label"] if len(detailed) > 1 else None
    confidence = top["score"] if top else base_confidence

    score_sum = sum(item["score"] for item in detailed)
    if detailed:
        causes = [
            {
                "label": f"{item['label']}을(를) 느낀 순간",
                "percent": round((item["score"] / score_sum) * 100) if score_sum else 0,
            }
            for item in detailed[:3]
        ]
    else:
        causes = [{"label": "오늘 하루의 여러 순간", "percent": 100}]

    if second_label:
        ai_message = (
            f"오늘 일기에서 {top_label} 감정과 함께 {second_label} 감정도 느껴졌어요. "
            "지금의 감정을 천천히 인정해도 괜찮고, 오늘 하루를 잘 지나온 자신에게 조금 다정하게 대해주세요."
        )
    else:
        ai_message = (
            f"오늘 일기에서 {top_label} 감정이 느껴졌어요. "
            "지금의 감정을 천천히 인정해도 괜찮고, 오늘 하루를 잘 지나온 자신에게 조금 다정하게 대해주세요."
        )

    return {
        "label": top_label,
        "confidence": confidence,
        "emotions": detailed if detailed else base_emotions,
        "detailed_emotions": detailed_emotions,
        "ai_one_liner": f"오늘 하루, {top_label} 감정이 마음을 가장 크게 채웠어요.",
        "ai_message": ai_message,
        "causes": causes,
        "keywords": [item["label"] for item in detailed] if detailed else [base_label],
        "mind_state": f"오늘은 {top_label} 감정이 두드러진 하루였어요. 스스로의 상태를 알아차린 것만으로도 의미가 있어요.",
        "growth_point": "감정을 있는 그대로 기록해본 것 자체가 오늘의 성장 포인트예요.",
        "tomorrow_message": "오늘보다 조금 더 편안한 하루가 되기를 바라요.",
        "activities": FALLBACK_ACTIVITIES[polarity],
        "quote": "충분히 쉬는 것도 하루를 잘 보내는 방법입니다.",
    }


def _gemini_result_to_dict(parsed, detailed_emotions: list[dict]) -> dict:
    return {
        "label": parsed.label.value,
        "confidence": parsed.confidence,
        "emotions": [{"label": e.label.value, "score": e.score} for e in parsed.emotions],
        "detailed_emotions": detailed_emotions,
        "ai_one_liner": parsed.aiOneLiner,
        "ai_message": parsed.aiMessage,
        "causes": [c.model_dump() for c in parsed.causes],
        "keywords": parsed.keywords,
        "mind_state": parsed.mindState,
        "growth_point": parsed.growthPoint,
        "tomorrow_message": parsed.tomorrowMessage,
        "activities": [a.model_dump() for a in parsed.activities],
        "quote": parsed.quote,
    }


class EmotionAnalysisService:
    """엔진 선택(KcBERT/FastText/Gemini) 오케스트레이션 계층. Router나 DB 세션에 의존하지 않아
    Gemini/랜덤 함수를 주입하면 HTTP나 실제 API 호출 없이 라우팅 로직만 결정론적으로 테스트할 수 있다."""

    def __init__(
        self,
        kcbert: KcBertLike | None = None,
        fasttext: FastTextLike | None = None,
        gemini_classify: GeminiClassifyFn = classify_with_gemini,
        random_fn: Callable[[], float] = random.random,
        settings_override: Settings | None = None,
    ):
        self._kcbert = kcbert if kcbert is not None else get_kcbert_classifier()
        self._fasttext = fasttext if fasttext is not None else get_fasttext_classifier()
        self._gemini_classify = gemini_classify
        self._random_fn = random_fn
        self._settings = settings_override or settings

    def analyze(self, text: str) -> AnalysisOutcome:
        start = time.perf_counter()

        base = self._kcbert.predict(text)
        detailed_emotions = self._fasttext.predict(text)

        force_local = self._settings.emotion_engine == "fasttext"
        traffic_ratio = self._clamped_ratio()

        # route.ts와 동일한 3단계 결정: 강제 로컬 → 트래픽 비율 → Gemini 실패 시 폴백.
        if force_local or self._random_fn() >= traffic_ratio:
            outcome = self._local_outcome(base, detailed_emotions)
        else:
            outcome = self._gemini_outcome(text, base, detailed_emotions)

        outcome.processing_time_ms = int((time.perf_counter() - start) * 1000)
        return outcome

    def _clamped_ratio(self) -> float:
        ratio = getattr(self._settings, "gemini_traffic_ratio", 1.0)
        return min(1.0, max(0.0, ratio))

    def _local_outcome(self, base: dict, detailed_emotions: list[dict]) -> AnalysisOutcome:
        logger.info("FastText 로컬 경로 사용 (engine=fasttext)")
        cost_tracking.record_fasttext_request()
        result = create_local_detailed_result(
            base["label"], base["confidence"], base["emotions"], detailed_emotions
        )
        return AnalysisOutcome(result=result, engine="fasttext")

    def _gemini_outcome(self, text: str, base: dict, detailed_emotions: list[dict]) -> AnalysisOutcome:
        api_key = self._settings.gemini_api_key
        if not api_key:
            logger.info("GEMINI_API_KEY 미설정, FastText 폴백")
            return self._local_outcome(base, detailed_emotions)

        try:
            gemini_result = self._gemini_classify(text, base["label"], api_key)
        except GeminiClientError as exc:
            logger.warning("Gemini 실패로 FastText 폴백: %s", exc)
            return self._local_outcome(base, detailed_emotions)

        logger.info("Gemini 경로 사용 (engine=gemini)")
        cost = cost_tracking.record_gemini_request(gemini_result.input_tokens, gemini_result.output_tokens)
        result = _gemini_result_to_dict(gemini_result.parsed, detailed_emotions)
        return AnalysisOutcome(
            result=result,
            engine="gemini",
            input_tokens=gemini_result.input_tokens,
            output_tokens=gemini_result.output_tokens,
            cost_usd=cost.total_cost_usd,
        )


def get_emotion_analysis_service() -> EmotionAnalysisService:
    return EmotionAnalysisService()
