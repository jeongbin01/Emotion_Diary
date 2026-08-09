import enum

from pydantic import BaseModel, Field

from app.services.ai.emotion_labels import DETAILED_EMOTION_LABELS

# Gemini responseSchema의 enum 제약과 동일한 목적. 33종(정확히는 30종, README 표기 그대로 유지)
# 감정 목록 밖의 값은 애초에 생성 후보에서 배제한다 — route.ts의 RESPONSE_SCHEMA와 동일.
EmotionLabel = enum.Enum("EmotionLabel", {label: label for label in DETAILED_EMOTION_LABELS})


class EmotionScoreSchema(BaseModel):
    label: EmotionLabel
    score: float = Field(description="해당 감정의 강도 (0~1)")


class CauseSchema(BaseModel):
    label: str = Field(description="원인을 짧은 명사구로 (예: 수면 부족, 업무 스트레스)")
    percent: float = Field(description="해당 원인이 차지하는 비중 (0~100)")


class ActivitySchema(BaseModel):
    icon: str = Field(description="활동을 표현하는 이모지 1개")
    label: str = Field(description="활동 이름, 6자 이내")


class GeminiAnalysisSchema(BaseModel):
    """route.ts의 RESPONSE_SCHEMA(Type.OBJECT)와 1:1 대응. google-genai 파이썬 SDK는 Pydantic
    모델을 response_schema로 받아 JSON Schema를 자동 생성하고, response.parsed로 바로 이
    타입의 인스턴스를 돌려준다 — TS 쪽의 JSON.parse 단계가 SDK 내부로 흡수된 것뿐, 검증 강도는
    동일하다(스키마가 필드 형태·enum을 보장, 그 밖의 실패는 GeminiClientError로 잡는다)."""

    label: EmotionLabel = Field(description="일기 전체를 가장 잘 대표하는 하나의 감정")
    confidence: float = Field(description="label에 대한 확신도 (0~1)")
    emotions: list[EmotionScoreSchema] = Field(description="일기에서 느껴지는 감정 최대 5개, 강한 순서대로")
    aiOneLiner: str = Field(
        description="오늘 감정을 관통하는 통찰을 정말 한 문장(15~35자)으로. 마침표 하나만 사용하고 줄바꿈 없이 작성"
    )
    aiMessage: str = Field(description="일기에 공감하는 2~3문장의 따뜻한 답변")
    causes: list[CauseSchema] = Field(description="오늘의 감정에 영향을 준 주요 원인 2~4가지와 각각의 비중(%)")
    keywords: list[str] = Field(description="일기 내용에서 뽑은 상황 키워드 3~5개, 짧은 명사형")
    mindState: str = Field(description="오늘 일기에서 드러나는 심리 상태에 대한 통찰, 2문장 이내")
    growthPoint: str = Field(description="오늘의 기록에서 찾을 수 있는 성장 포인트나 스스로를 다독일 말, 2문장 이내")
    tomorrowMessage: str = Field(description="내일의 나에게 보내는 짧은 응원 메시지, 1~2문장")
    activities: list[ActivitySchema] = Field(description="오늘의 감정 상태에 도움이 될 만한 짧은 추천 활동 4가지")
    quote: str = Field(description="오늘 하루를 위한 짧은 응원 문장 1개")
