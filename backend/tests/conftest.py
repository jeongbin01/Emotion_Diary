import sys
from pathlib import Path

# backend/ 자체를 패키지로 설치하지 않고 바로 `pytest`로 돌릴 수 있도록 backend/를 sys.path에 추가한다.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
