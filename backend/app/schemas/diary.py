import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.schemas.emotion_analysis import EmotionAnalysisOut


class DiaryCreateRequest(BaseModel):
    text: str


class DiaryOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: uuid.UUID
    content: str
    created_at: datetime
    emotion_analysis: EmotionAnalysisOut | None = None
