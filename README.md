# 오늘의 하루

하루를 자유롭게 기록하면 AI가 감정을 분석해 따뜻한 대시보드 형태로 보여주는 감정 일기 웹 애플리케이션입니다.

프론트엔드(Next.js)와 백엔드(FastAPI)가 분리된 구조로, KcBERT(극성 분류) → Gemini(생성형 세부 감정 분석) 또는 FastText(무료 CPU 다중 라벨 분류) 3단계 파이프라인을 갖고 있습니다. Gemini 호출 비율을 환경 변수로 조절해 서비스 비용을 0에 가깝게 수렴시킬 수 있는 구조를 실제로 구현하고 실측했습니다.

> 이 프로젝트를 만든 이유, 기술 선택 배경, 아키텍처, 실측 비용 데이터 등 자세한 설계 문서는 **[docs/TECHNICAL_DETAILS.md](docs/TECHNICAL_DETAILS.md)**에 정리했습니다.

---

## 주요 기능

- **감정 일기 작성** — 하루 있었던 일을 자유롭게 기록 (10자 이상), 줄노트 배경 + 손글씨 폰트(Gaegu)
- **AI 감정 분석** — KcBERT로 극성(긍정/중립/부정) 1차 분류 후, Gemini가 33가지 세부 감정 중 최대 5개를 강도순으로 생성. 원인·심리 통찰·성장 포인트·추천 활동까지 함께 제공
- **비용 절감 Fallback** — `GEMINI_API_KEY`가 없거나 호출이 실패해도, FastText가 로컬에서 33종 세부 감정을 분류해 자동 대체 (비용 $0)
- **감정 대시보드** — Apple Activity Ring 스타일 원형 진행률, 감정 원인 도넛 차트, 최근 7일 감정 변화 라인 차트

---

## 기술 스택

| 분야 | 기술 |
| -- | -- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | FastAPI, Python 3.11, Pydantic v2, SQLAlchemy 2.0 (async) + Alembic |
| Database | SQLite (로컬 개발) / PostgreSQL (배포 전제) |
| AI | KcBERT-base (PyTorch, Transformers), FastText (CPU 다중 라벨 분류), Google Gemini API (`gemini-2.5-flash`) |
| Design | Pretendard, Gaegu, Warm Minimal Design System |

---

## 실행 방법

프론트(Next.js)와 백엔드(FastAPI)를 각각 독립 프로세스로 띄워야 합니다. AI 모델·API 키·DB는 전부 백엔드 쪽에 있으므로 **백엔드를 먼저 띄우는 것을 권장합니다.**

### 1. 백엔드 (FastAPI)

```bash
cd backend
pip install -e ".[dev]"
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

`backend/.env` 파일을 만들어 환경 변수를 설정합니다.

```env
GEMINI_API_KEY=your_gemini_api_key_here

# 선택. Gemini 호출 비율(0~1). 기본값 1 = 항상 Gemini 시도.
GEMINI_TRAFFIC_RATIO=1

# 선택. "fasttext"로 두면 Gemini를 아예 호출하지 않음 (비용 완전히 $0).
EMOTION_ENGINE=gemini
```

> ⚠️ `backend/.env`는 GitHub에 업로드하지 마세요. API 키가 없어도 FastText 기반으로 감정 분석은 정상 동작합니다.

**테스트**

```bash
cd backend
python -m pytest
```

### 2. 프론트엔드 (Next.js)

```bash
npm install
npm run dev
```

`.env.local`에 백엔드 주소를 지정합니다 (기본값 `http://localhost:8000`이라 로컬 개발에서는 생략 가능).

```env
BACKEND_URL=http://localhost:8000
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다.

---

## 프로젝트 구조

```text
emotional-diary/
├── app/                # Next.js 프론트엔드 (컴포넌트, API 프록시)
├── backend/             # FastAPI 백엔드
│   ├── app/              # main.py, api/, services/, repositories/, models/, schemas/
│   ├── models/            # KcBERT, FastText 모델 바이너리 (Git LFS)
│   ├── training/           # FastText 학습 스크립트
│   ├── alembic/            # DB 마이그레이션
│   └── tests/
└── docs/
    └── TECHNICAL_DETAILS.md  # 설계 배경, 아키텍처, 비용 분석 등 상세 문서
```

전체 컴포넌트 목록과 폴더 구조 상세는 [docs/TECHNICAL_DETAILS.md](docs/TECHNICAL_DETAILS.md#프로젝트-구조)를 참고하세요.

---

## 향후 계획

- [ ] 히스토리 조회 화면 (캘린더 뷰 포함)
- [ ] 사용자 로그인 및 계정별 기록 관리 (JWT 인증)
- [ ] 감정 통계·월간 리포트
- [ ] FastText 재학습 (실제 사용자 일기 기반)
- [ ] 배포 환경 구성 (Frontend: Vercel / Backend: Docker)

전체 계획과 진행 상황은 [docs/TECHNICAL_DETAILS.md](docs/TECHNICAL_DETAILS.md#향후-계획)를 참고하세요.

---

## 라이선스

본 프로젝트는 개인 학습과 포트폴리오를 목적으로 제작되었습니다. 상업적 이용을 목적으로 하지 않습니다.
