import logging
from dataclasses import dataclass

from google import genai
from google.genai import types

from app.core.config import settings
from app.services.ai.gemini_schema import GeminiAnalysisSchema

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash"


class GeminiClientError(Exception):
    """API 키 없음 이후 단계의 실패(네트워크 오류, 콘텐츠 차단, 파싱 실패 등)를 한 지점에서
    잡기 위한 예외. route.ts의 classifyWithGemini try/catch와 동일한 역할을 한다."""


@dataclass
class GeminiCallResult:
    parsed: GeminiAnalysisSchema
    input_tokens: int
    output_tokens: int


def _build_prompt(text: str, base_label: str) -> str:
    # route.ts의 프롬프트와 문자 그대로 동일하다 — 모델을 옮겨도 같은 입력에 같은 결과 분포를
    # 기대할 수 있어야 이관 전후 비교가 의미 있다.
    return f"""당신은 따뜻하고 공감 능력이 뛰어난 감정 일기 AI입니다.
사용자가 오늘 하루 일기를 작성했습니다. 아래 일기 내용을 읽고 감정을 세밀하게 분석해주세요.

일기 내용:
"{text}"

참고로 간단한 감정 분류 모델은 이 일기를 "{base_label}" 계열로 예측했습니다.

주어진 감정 목록 중에서만 골라 label, emotions를 작성하고,
각 필드는 반드시 이 일기에 실제로 등장한 상황, 행동 또는 표현과 감정 분석 결과를 함께 반영하세요.
누구에게나 적용되는 뻔한 문구나 이전 답변을 반복하지 마세요.
aiOneLiner에는 오늘 감정을 관통하는 통찰을 정말 한 문장(15~35자, 마침표 하나, 줄바꿈 없이)으로 작성하고,
aiMessage에는 일기의 구체적인 맥락을 짚어 공감하며 2~3문장으로 따뜻하게 답변해주세요.
추가로 causes(감정 원인과 비중), keywords(상황 키워드), mindState(심리 상태 통찰), growthPoint(성장 포인트),
tomorrowMessage(내일의 나에게), activities(현재 감정과 오늘의 상황에 맞춰 바로 할 수 있는 추천 활동 4개),
quote(오늘의 감정에 어울리는 새로운 응원 문장)도 함께 작성해주세요."""


def classify_with_gemini(text: str, base_label: str, api_key: str) -> GeminiCallResult:
    timeout_ms = int(settings.gemini_timeout_seconds * 1000)
    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=timeout_ms))
    prompt = _build_prompt(text, base_label)

    logger.info("Gemini 호출 시작 (timeout=%.0fs)", settings.gemini_timeout_seconds)
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiAnalysisSchema,
                # 닫힌 스키마 추출 작업이라 thinking의 효용이 낮다고 판단해 껐다 — README Cost
                # Optimization에서 실측한 6.3배 절감이 이 설정 하나에서 나온다.
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
    except Exception as exc:  # 타임아웃 포함, SDK/네트워크 실패 전부 한 지점에서 폴백으로 넘긴다.
        logger.warning("Gemini 호출 실패, FastText 폴백으로 전환: %s", exc)
        raise GeminiClientError(str(exc)) from exc

    parsed = response.parsed
    if parsed is None:
        logger.warning("Gemini 응답 파싱 실패, FastText 폴백으로 전환")
        raise GeminiClientError("Gemini 응답을 스키마로 파싱하지 못했습니다.")

    usage = response.usage_metadata
    input_tokens = int(getattr(usage, "prompt_token_count", 0) or 0)
    # candidates(실제 출력 문장) + thoughts(내부 추론) 모두 output 단가로 과금된다 (geminiCost.ts와 동일).
    output_tokens = int(getattr(usage, "candidates_token_count", 0) or 0) + int(
        getattr(usage, "thoughts_token_count", 0) or 0
    )
    logger.info("Gemini 호출 성공 (input_tokens=%d, output_tokens=%d)", input_tokens, output_tokens)

    return GeminiCallResult(parsed=parsed, input_tokens=input_tokens, output_tokens=output_tokens)
