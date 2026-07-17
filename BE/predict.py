import torch
from transformers import BertTokenizer, BertForSequenceClassification

MODEL_PATH = "./model"
LABELS = {0: "부정", 1: "중립", 2: "긍정"}

print("모델 로딩 중...")
tokenizer = BertTokenizer.from_pretrained(MODEL_PATH)
model = BertForSequenceClassification.from_pretrained(MODEL_PATH)
model.eval()
print("준비 완료! 종료하려면 Ctrl+C\n")

while True:
    text = input("일기 내용 입력: ").strip()
    if not text:
        continue

    inputs = tokenizer(text, return_tensors="pt", max_length=300, truncation=True)
    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.softmax(outputs.logits, dim=-1)[0]
    pred = torch.argmax(probs).item()

    print(f"  감정: {LABELS[pred]}  ({probs[pred]*100:.1f}%)")
    print(f"  [부정 {probs[0]*100:.1f}%  중립 {probs[1]*100:.1f}%  긍정 {probs[2]*100:.1f}%]\n")
