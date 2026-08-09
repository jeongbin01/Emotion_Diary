from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    # 프론트(Next.js)가 기존 /api/analyze에서 기대하던 camelCase JSON과 동일한 응답 형태를
    # 유지한다. FastAPI는 response_model_by_alias=True가 기본값이라 별도 설정 없이 그대로 출력에
    # 적용된다.
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class EmotionScoreOut(CamelModel):
    label: str
    score: float


class CauseOut(CamelModel):
    label: str
    percent: float


class ActivityOut(CamelModel):
    icon: str
    label: str


class EmotionAnalysisOut(CamelModel):
    label: str
    confidence: float
    emotions: list[EmotionScoreOut]
    detailed_emotions: list[EmotionScoreOut]
    ai_one_liner: str
    ai_message: str
    causes: list[CauseOut]
    keywords: list[str]
    mind_state: str
    growth_point: str
    tomorrow_message: str
    activities: list[ActivityOut]
    quote: str
    engine: str
