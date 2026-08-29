import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.schemas.emotion_analysis import EmotionAnalysisOut


class DiaryCreateRequest(BaseModel):
    text: str = Field(description="감정 분석할 일기 내용", min_length=1)


class DiaryOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: uuid.UUID = Field(description="일기 고유 ID")
    content: str = Field(description="일기 내용")
    created_at: datetime = Field(description="작성 일시")
    emotion_analysis: EmotionAnalysisOut | None = Field(default=None, description="AI 감정 분석 결과")
