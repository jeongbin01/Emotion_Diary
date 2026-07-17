import sys
import json
import torch
from transformers import BertTokenizer, BertForSequenceClassification

MODEL_PATH = "./model"
LABELS = {0: "부정", 1: "중립", 2: "긍정"}

tokenizer = BertTokenizer.from_pretrained(MODEL_PATH)
model = BertForSequenceClassification.from_pretrained(MODEL_PATH)
model.eval()

text = sys.argv[1]
inputs = tokenizer(text, return_tensors="pt", max_length=300, truncation=True)
with torch.no_grad():
    outputs = model(**inputs)

probs = torch.softmax(outputs.logits, dim=-1)[0]
pred = int(torch.argmax(probs).item())

emotions = [{"label": LABELS[i], "score": float(probs[i])} for i in range(len(LABELS))]
print(json.dumps({"label": LABELS[pred], "confidence": float(probs[pred]), "emotions": emotions}))
