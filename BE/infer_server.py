import sys
import json
import torch
from transformers import BertTokenizer, BertForSequenceClassification

sys.stdin.reconfigure(encoding="utf-8")
sys.stdout.reconfigure(encoding="utf-8")

MODEL_PATH = "./model"
LABELS = {0: "부정", 1: "중립", 2: "긍정"}

tokenizer = BertTokenizer.from_pretrained(MODEL_PATH)
model = BertForSequenceClassification.from_pretrained(MODEL_PATH)
model.eval()


def analyze(text: str) -> dict:
    inputs = tokenizer(text, return_tensors="pt", max_length=300, truncation=True)
    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.softmax(outputs.logits, dim=-1)[0]
    pred = int(torch.argmax(probs).item())

    emotions = [{"label": LABELS[i], "score": float(probs[i])} for i in range(len(LABELS))]
    return {"label": LABELS[pred], "confidence": float(probs[pred]), "emotions": emotions}


print(json.dumps({"status": "ready"}), flush=True)

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        request = json.loads(line)
        result = analyze(request["text"])
        print(json.dumps(result), flush=True)
    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)
