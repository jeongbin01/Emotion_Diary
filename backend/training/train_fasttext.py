"""FastText 기반 33종 세부 감정 다중 라벨 분류기 학습 스크립트.

왜 FastText인가
----------------
Gemini에게 "이 일기는 33가지 감정 중 무엇인가"만 물어보는 것도 매 요청마다 과금되는 생성형 API
호출이다. 이 판단 자체는 열린 질문(원인 추론, 통찰 문장 생성)이 아니라 닫힌 다중 라벨 분류 문제라서,
CPU 연산만으로 끝나는 얕은 선형 모델(FastText)로 상당 부분 대체할 수 있다. KcBERT(3-class 극성)를
같은 발상으로 이미 쓰고 있어서, 이번엔 그 발상을 세부 감정(33-class, multi-label) 단계까지
넓힌 것이다.

이 스크립트가 하는 일
----------------------
1. emotion_keywords.py의 시드 키워드 + 문장 템플릿으로 학습 코퍼스를 합성한다(weak supervision).
2. 라벨 2개를 한 문장에 섞은 다중 라벨 예시도 일부 섞는다.
3. FastText supervised(loss=ova, 즉 One-vs-All)로 다중 라벨 분류기를 학습한다.
4. 검증셋 기준 precision/recall(k=1,3)을 출력한다.
5. backend/models/fasttext/emotion_ft.bin 으로 저장한다. backend/app/services/ai/fasttext_classifier.py가 이 파일을 읽는다.

한계
----
학습 데이터가 사람이 쓴 일기가 아니라 템플릿으로 합성한 문장이라, 검증 지표가 실제 서비스
정확도를 보장하지 않는다. "돈을 아예 안 쓰고도 어느 정도 쓸모 있는 결과를 낼 수 있는가"를
검증하는 첫 단계로 보는 게 맞고, 실 트래픽이 쌓이면 실제 일기 텍스트(익명화) + 사람 검수
라벨로 교체 학습하는 게 다음 단계다.
"""

import random
import time
from itertools import combinations
from pathlib import Path

import fasttext

from emotion_keywords import EMOTION_KEYWORDS, SENTENCE_TEMPLATES

random.seed(42)

TRAINING_DIR = Path(__file__).parent
BACKEND_DIR = TRAINING_DIR.parent
DATA_DIR = TRAINING_DIR / "data"
MODEL_DIR = BACKEND_DIR / "models" / "fasttext"
TRAIN_PATH = DATA_DIR / "train.txt"
VALID_PATH = DATA_DIR / "valid.txt"
MODEL_PATH = MODEL_DIR / "emotion_ft.bin"

VALID_RATIO = 0.15
# 다중 라벨 예시 비율: 서로 다른 두 감정의 키워드를 한 문장에 이어붙여
# "오늘 뿌듯했지만 한편으로는 피곤했다" 같은 복합 감정 문장을 흉내낸다.
MULTI_LABEL_RATIO = 0.2


def build_single_label_examples() -> list[tuple[list[str], str]]:
    examples = []
    for label, keywords in EMOTION_KEYWORDS.items():
        for kw in keywords:
            for template in SENTENCE_TEMPLATES:
                text = template.format(kw=kw)
                examples.append(([label], text))
    return examples


def build_multi_label_examples(count: int) -> list[tuple[list[str], str]]:
    labels = list(EMOTION_KEYWORDS.keys())
    connectors = ["그리고", "하지만", "그런데", "동시에", "또", "한편으로는"]
    examples = []
    for _ in range(count):
        label_a, label_b = random.sample(labels, 2)
        kw_a = random.choice(EMOTION_KEYWORDS[label_a])
        kw_b = random.choice(EMOTION_KEYWORDS[label_b])
        connector = random.choice(connectors)
        text = f"오늘 {kw_a} {connector} {kw_b}"
        examples.append(([label_a, label_b], text))
    return examples


def to_fasttext_line(labels: list[str], text: str) -> str:
    label_str = " ".join(f"__label__{label}" for label in labels)
    return f"{label_str} {text}"


def main():
    single = build_single_label_examples()
    multi_count = int(len(single) * MULTI_LABEL_RATIO)
    multi = build_multi_label_examples(multi_count)

    all_examples = single + multi
    random.shuffle(all_examples)

    split_at = int(len(all_examples) * (1 - VALID_RATIO))
    train_examples = all_examples[:split_at]
    valid_examples = all_examples[split_at:]

    DATA_DIR.mkdir(exist_ok=True)
    MODEL_DIR.mkdir(exist_ok=True)

    with open(TRAIN_PATH, "w", encoding="utf-8") as f:
        for labels, text in train_examples:
            f.write(to_fasttext_line(labels, text) + "\n")

    with open(VALID_PATH, "w", encoding="utf-8") as f:
        for labels, text in valid_examples:
            f.write(to_fasttext_line(labels, text) + "\n")

    print(f"[data] 라벨 {len(EMOTION_KEYWORDS)}개, 학습 {len(train_examples)}건, 검증 {len(valid_examples)}건")

    start = time.time()
    model = fasttext.train_supervised(
        input=str(TRAIN_PATH),
        lr=0.5,
        epoch=50,
        wordNgrams=2,
        dim=32,
        minCount=1,
        minn=2,
        maxn=5,
        # 기본 bucket=2,000,000은 문자 n-gram 해시 테이블 크기라 실제 어휘가 적은(라벨 30개짜리)
        # 이 코퍼스에는 과하다 — 그대로 두면 모델이 학습 데이터 크기와 무관하게 수백 MB로 저장된다.
        # "CPU 연산만으로 유지비를 낮춘다"는 목적과 맞지 않아 bucket을 실제 필요한 수준으로 줄인다.
        bucket=100000,
        loss="ova",  # multi-label: 라벨마다 독립적인 이진 확률
    )
    elapsed = time.time() - start
    print(f"[train] {elapsed:.1f}초 소요, CPU 전용")

    n, precision, recall = model.test(str(VALID_PATH), k=1)
    print(f"[valid k=1] n={n} precision={precision:.3f} recall={recall:.3f}")
    n3, precision3, recall3 = model.test(str(VALID_PATH), k=3)
    print(f"[valid k=3] n={n3} precision={precision3:.3f} recall={recall3:.3f}")

    model.save_model(str(MODEL_PATH))
    size_mb = MODEL_PATH.stat().st_size / (1024 * 1024)
    print(f"[save] fp32 {MODEL_PATH} ({size_mb:.1f}MB)")

    # 추가 압축: product quantization으로 임베딩 행렬을 압축해 배포/로딩 비용을 더 낮춘다.
    model.quantize(input=str(TRAIN_PATH), retrain=True, cutoff=100000, qnorm=True)
    model.save_model(str(MODEL_PATH))
    quantized_size_mb = MODEL_PATH.stat().st_size / (1024 * 1024)
    n_q, precision_q, recall_q = model.test(str(VALID_PATH), k=1)
    print(f"[quantize] {MODEL_PATH} ({quantized_size_mb:.1f}MB, {size_mb / quantized_size_mb:.1f}x 압축)")
    print(f"[valid k=1 after quantize] n={n_q} precision={precision_q:.3f} recall={recall_q:.3f}")


if __name__ == "__main__":
    main()
