from functools import lru_cache

import fasttext

from app.core.config import settings

# BE/infer_server.py와 동일한 값. train_fasttext.py의 검증 지표(precision@1 ≈ 0.95)를 참고해
# 정한 threshold라, 재학습하면 다시 튜닝해야 한다.
FASTTEXT_THRESHOLD = 0.3
FASTTEXT_TOP_K = 5


class FastTextClassifier:
    def __init__(self, model_path: str):
        self.model = fasttext.load_model(model_path)

    def predict(self, text: str) -> list[dict]:
        # fasttext 0.9.2의 predict()가 numpy 2.x와 충돌하는 문제를 우회하기 위해 pybind 객체를
        # 직접 호출한다 — BE/infer_server.py와 동일한 워크어라운드.
        single_line = text.replace("\n", " ") + "\n"
        predictions = self.model.f.predict(single_line, FASTTEXT_TOP_K, FASTTEXT_THRESHOLD, "strict")
        detailed = [
            {"label": label.replace("__label__", ""), "score": float(prob)}
            for prob, label in predictions
        ]
        detailed.sort(key=lambda item: item["score"], reverse=True)
        return detailed


@lru_cache(maxsize=1)
def get_fasttext_classifier() -> FastTextClassifier:
    return FastTextClassifier(settings.fasttext_model_path)
