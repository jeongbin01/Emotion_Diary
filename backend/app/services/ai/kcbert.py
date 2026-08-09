from functools import lru_cache

import torch
from transformers import BertForSequenceClassification, BertTokenizer

from app.core.config import settings

LABELS = {0: "부정", 1: "중립", 2: "긍정"}


class KcBertClassifier:
    """BE/infer_server.py의 KcBERT 부분을 그대로 옮긴 것. 상주 Python 프로세스가 아니라
    FastAPI 프로세스 안에서 모듈 하나로 존재한다는 점만 다르다 — stdin/stdout IPC가 사라지고
    함수 호출로 대체된다(docs/PORTFOLIO_REDESIGN.md §7 참고)."""

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
