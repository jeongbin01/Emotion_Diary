# app/lib/emotion-theme.ts의 EMOTION_THEME 키 목록(모델 기본 3라벨 제외)과 순서까지 그대로
# 동기화한 값. Gemini responseSchema의 enum과 FastText 학습 라벨이 둘 다 이 목록을 기준으로 한다.
# emotion-theme.ts가 바뀌면 이 목록도 함께 갱신해야 한다(단일 source-of-truth가 TS 쪽에 있다는
# 뜻이라, Phase 2 이후 프론트를 FastAPI 기준으로 재편할 때는 이 상수를 공유 스키마로 옮기는 것도
# 고려할 지점이다).
DETAILED_EMOTION_LABELS: list[str] = [
    # 긍정
    "행복", "사랑", "설렘", "감사", "안도", "자부심", "경외감",
    "평화로움", "흥분", "만족", "안심", "편안함", "기대", "감동",
    # 부정
    "슬픔", "분노", "불안", "혐오", "죄책감", "수치심", "질투",
    "외로움", "무기력", "후회",
    # 중립
    "놀람", "지루함", "피곤함", "혼란", "당황", "긴장",
]

BASE_POLARITY_LABELS: list[str] = ["긍정", "중립", "부정"]
