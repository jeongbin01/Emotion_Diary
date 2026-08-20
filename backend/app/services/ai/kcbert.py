from functools import lru_cache

import torch
from transformers import BertForSequenceClassification, BertTokenizer

from app.core.config import settings

LABELS = {0: "부정", 1: "중립", 2: "긍정"}


class KcBertClassifier:
    """감정 극성(긍정/중립/부정) 3-class 분류기. 파인튜닝된 KcBERT를 in-process로 로딩해 쓴다."""

    def __init__(self, model_path: str):
        self.tokenizer = BertTokenizer.from_pretrained(model_path)
        self.model = BertForSequenceClassification.from_pretrained(model_path)
        self.model.eval()

    def predict(self, text: str) -> dict:
        inputs = self.tokenizer(text, return_tensors="pt", max_length=300, truncation=True)
        with torch.no_grad():
            outputs = self.model(**inputs)

        probs = torch.softmax(outputs.logits, dim=-1)[0]
        pred = int(torch.argmax(probs).item())

        emotions = [{"label": LABELS[i], "score": float(probs[i])} for i in range(len(LABELS))]
        return {
            "label": LABELS[pred],
            "confidence": float(probs[pred]),
            "emotions": emotions,
        }


@lru_cache(maxsize=1)
def get_kcbert_classifier() -> KcBertClassifier:
    # 프로세스당 한 번만 로딩한다 — FastAPI lifespan이 부팅 시 이 함수를 호출해 예열한다.
    return KcBertClassifier(settings.kcbert_model_path)
