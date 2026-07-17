# 오늘의 하루

하루를 자유롭게 기록하면 AI가 감정을 분석하고, 오늘의 감정을 따뜻한 대시보드 형태로 시각화해주는 감성 일기 웹 애플리케이션입니다.

로컬 KcBERT 모델이 1차로 감정의 극성(긍정/중립/부정)을 판단하고, Gemini가 그 결과를 참고해 33가지 세부 감정 중 하나로 분류하며 감정 원인·키워드·심리 통찰·추천 활동 등을 함께 생성합니다.

---

## 주요 기능

### 감정 일기 작성

* 하루 동안 있었던 일을 자유롭게 기록
* 실제 공책처럼 줄노트 배경과 빨간 여백선이 있는 입력창
* Gaegu 손글씨 폰트로 직접 쓴 듯한 느낌

### AI 감정 분석

* KcBERT 기반 1차 극성 분석 (긍정/중립/부정), 로컬 모델로 오프라인 추론
* Gemini가 일기 내용을 바탕으로 33가지 세부 감정(행복, 설렘, 죄책감, 무기력 등) 중 최대 5개를 강도순으로 분류
* 감정 원인(causes)과 비중, 상황 키워드(keywords), 심리 상태 통찰(mindState), 성장 포인트(growthPoint), 내일의 나에게 보내는 응원(tomorrowMessage), 추천 활동 4가지(activities), 오늘의 응원 문장(quote)까지 한 번에 생성
* AI 분석 한 줄(aiOneLiner)과 AI의 한마디(aiMessage)를 분리해, 요약 카드에는 진짜 한 문장을, 코멘트 카드에는 2~3문장의 따뜻한 답변을 표시
* Gemini 사용이 불가능할 경우 KcBERT의 극성 결과와 기본 위로 메시지로 자동 대체(fallback)

### 오늘의 감정 대시보드

* Apple Activity Ring 스타일의 얇은 원형 진행률로 오늘의 대표 감정과 신뢰도 표시
* 감정 요약 카드에 감정 강도(별점), AI 분석 한 줄, 오늘의 키워드를 함께 정리
* 감정 분포 TOP3, 감정 원인 도넛 차트, 최근 7일 감정 변화 라인 차트로 데이터 시각화
* AI 추천 활동, 오늘의 문장, 감정 분석 상세(심리 상태·주요 원인·성장 포인트·내일의 나에게) 카드 제공

---

## 기술 스택

### FrontEnd

* Next.js 16 (App Router)
* React 19
* TypeScript
* Tailwind CSS v4
* lucide-react (아이콘)

### AI

* KcBERT-base (로컬 fine-tuned 3-class 극성 분류기)
* PyTorch / Transformers
* Google Gemini API (`gemini-2.5-flash`, 구조화된 JSON 출력)

### Design

* Pretendard (본문), Gaegu (일기 손글씨)
* Warm Minimal 디자인 시스템 — Apple HIG / Material 3 / Notion / Muji 톤의 카드·컬러 토큰 기반

---

## 실행 방법

### 1. 의존성 설치

#### FrontEnd

```bash
npm install
```

#### Python (AI 모델)

```bash
pip install torch transformers
```

> `BE/model/` 폴더에 모델이 포함되어 있어 별도 다운로드가 필요하지 않습니다.

---

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성합니다.

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Gemini API 키가 없어도 감정 분석 기능은 정상 동작하며, 세부 감정 대신 KcBERT의 긍정/중립/부정 결과와 기본 위로 메시지로 대체됩니다.

---

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:3000
```

> 서버가 시작되면 `instrumentation.ts`가 Python 추론 프로세스(`BE/infer_server.py`)를 미리 백그라운드에서 예열합니다. 첫 요청 전에 모델 로딩(수십 초~수 분)이 끝나지 않았다면 첫 일기 분석 요청이 다소 오래 걸릴 수 있습니다. 이후 요청부터는 상주 프로세스가 재사용되어 수 초 내로 응답합니다.

---

## 📁 프로젝트 구조

```text
emotional-diary/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts          # 감정 분석 API (KcBERT + Gemini)
│   │
│   ├── components/
│   │   ├── DiaryForm.tsx         # 일기 입력 폼 및 대시보드 레이아웃
│   │   ├── EmotionRingCard.tsx   # 오늘의 감정 원형 진행률 카드
│   │   ├── EmotionSummaryCard.tsx# 감정 요약(퍼센트/신뢰도/강도/키워드) 카드
│   │   ├── EmotionTop3Card.tsx   # 감정 분포 TOP3 카드
│   │   ├── CauseDonutChart.tsx   # 감정 원인 분석 도넛 차트
│   │   ├── WeeklyTrendChart.tsx  # 최근 7일 감정 변화 라인 차트
│   │   ├── DiaryEntry.tsx        # 작성한 일기 원문 카드 (줄노트 배경)
│   │   ├── AiMemo.tsx            # AI의 한마디 카드
│   │   ├── ActivitiesCard.tsx    # AI 추천 활동 카드
│   │   ├── QuoteCard.tsx         # 오늘의 문장 카드
│   │   ├── EmotionDetailSummary.tsx # 감정 분석 상세(심리 상태/주요 원인/성장 포인트/내일의 나에게)
│   │   └── EmotionChart.tsx      # 전체 감정 분포 바 차트
│   │
│   ├── lib/
│   │   ├── emotion-theme.ts      # 33가지 감정 → 색상/아이콘/기분 점수 매핑
│   │   └── inferServer.ts        # 상주 Python 프로세스 관리 (spawn/큐/재시작)
│   │
│   ├── globals.css               # Warm Minimal 디자인 토큰 및 유틸리티 클래스
│   ├── layout.tsx
│   └── page.tsx
│
├── instrumentation.ts            # 서버 부팅 시 Python 추론 프로세스 예열
│
└── BE/
    ├── infer_server.py           # 상주 추론 서버 (stdin/stdout JSON 프로토콜)
    ├── infer.py                  # 단발성 CLI 추론 스크립트
    ├── predict.py                # 대화형 테스트 스크립트
    └── model/                    # KcBERT fine-tuned 3-class 모델
```

---

## 🧩 컴포넌트 설명

| 컴포넌트 | 설명 |
| -- | -- |
| DiaryForm | 일기 입력 폼과 대시보드 전체 레이아웃 구성 |
| EmotionRingCard | 오늘의 대표 감정을 원형 진행률(Apple Activity Ring 스타일)로 표시 |
| EmotionSummaryCard | 감정 퍼센트, 신뢰도 바, 감정 강도 별점, AI 분석 한 줄, 오늘의 키워드를 한 카드에 정리 |
| EmotionTop3Card | 감정 분포 상위 3개를 바 형태로 표시 |
| CauseDonutChart | 감정 원인과 비중을 도넛 차트로 표시 |
| WeeklyTrendChart | 최근 7일간 감정 변화를 이모지 포인트 라인 차트로 표시 |
| DiaryEntry | 작성한 일기 원문을 줄노트 배경 위에 손글씨 폰트로 표시 |
| AiMemo | AI의 한마디(2~3문장 코멘트)를 줄노트 배경 카드로 표시 |
| ActivitiesCard | 오늘의 감정에 맞는 추천 활동 4가지를 아이콘과 함께 표시 |
| QuoteCard | 오늘 하루를 위한 응원 문장을 표시 |
| EmotionDetailSummary | 심리 상태·주요 원인·성장 포인트·내일의 나에게를 4개 카드로 표시 |
| EmotionChart | 감지된 전체 세부 감정을 강도순 바 차트로 표시 |

---

## 😊 감정 분류

KcBERT는 1차로 3가지 극성을 분류하고, Gemini가 이를 참고해 아래 33가지 세부 감정 중 하나(및 관련 감정 최대 5개)로 다시 분류합니다.

| 극성 | 세부 감정 |
| -- | -------- |
| 긍정 | 행복, 사랑, 설렘, 감사, 안도, 자부심, 경외감, 평화로움, 흥분, 만족, 안심, 편안함, 기대, 감동 |
| 부정 | 슬픔, 분노, 불안, 혐오, 죄책감, 수치심, 질투, 외로움, 무기력, 후회 |
| 중립 | 놀람, 지루함, 피곤함, 혼란, 당황, 긴장 |

Gemini API를 사용할 수 없는 경우, KcBERT의 긍정/중립/부정 결과가 그대로 사용됩니다.

---

## 🎨 감정 색상·아이콘 체계

33가지 감정 각각이 고유한 색상과 표정 이모지를 가집니다. 큰 틀에서는 아래 색 계열을 따르되, 같은 계열 안에서도 감정마다 톤이 미세하게 다릅니다.

| 극성 | 색상 범위 | 예시 |
| -- | -------- | ---- |
| 긍정 | 황토 ~ 골드 | 행복 😄, 사랑 🥰, 설렘 🤩, 기대 🤗 |
| 부정 | 슬레이트 ~ 인디고 | 슬픔 😢, 분노 😡, 죄책감 😓, 외로움 🥺 |
| 중립 | 세이지 ~ 그레이 | 놀람 😲, 혼란 😵‍💫, 긴장 😬 |

이 색상·이모지는 감정 진행률 링, 차트, 배지 등 대시보드 전반에서 일관되게 사용되며, `WeeklyTrendChart`는 감정별 기분 점수(effect 기반)로 최근 7일 변화 그래프의 오늘 포인트 위치를 계산합니다.

---

## 🎨 디자인 시스템

**Warm Minimal** — Apple HIG, Material 3, Notion, Muji 톤을 참고한 카드 기반 디자인 시스템입니다.

### 컬러 토큰 (`globals.css`)

| 토큰 | 값 | 용도 |
| -- | -- | -- |
| `--bg` | `#F8F4EE` | 페이지 배경 |
| `--card` | `#FFFFFF` | 카드 배경 |
| `--primary` | `#8B74D9` | 포인트 컬러(보라) |
| `--secondary` | `#F5F2FF` | 태그·강조 배경 |
| `--border` | `#E8E3DA` | 카드 테두리 |
| `--text` / `--sub-text` | `#2B2B2B` / `#6D6D6D` | 본문 / 보조 텍스트 |

### 공통 유틸리티 클래스

* `.ds-card` / `.ds-card-hover` — 흰 배경, 1px 보더, radius 20px, 옅은 그림자, hover 시 `translateY(-2px)`
* `.ds-tag` — pill 형태 키워드 태그
* `.ds-progress-track` / `.ds-progress-fill` — 둥근 진행 바
* `.fade-up` — 페이지 로드 시 섹션이 아래에서 위로 살짝 떠오르는 애니메이션
* `.notepad-lines` — 줄노트 배경(가로 룰선). 입력창, 오늘의 기록, AI의 한마디, 오늘의 문장 카드에서 손글씨/코멘트가 실제 공책 위에 쓰인 듯한 느낌을 준다

### 📖 노트 컨셉

실제 공책에 일기를 작성하는 느낌을 살리기 위해 다음 요소를 적용했습니다.

* 입력창과 오늘의 기록 카드에 왼쪽 빨간 여백선(입력창) 또는 줄노트 배경(`notepad-lines`) 적용
* 일기 원문은 Gaegu 손글씨 폰트로 표시해, 쓸 때와 결과에서 보여질 때가 자연스럽게 이어지도록 구성
* AI의 한마디·오늘의 문장 카드도 같은 줄노트 배경을 공유해 전체 카드가 하나의 노트북처럼 읽히도록 함

---

## 🔮 향후 개선 계획

* 감정 기록 저장 기능
* 월별 감정 통계
* 감정 캘린더
* 로그인 및 사용자 관리
* 감정 변화 추이 시각화 (현재는 최근 7일 중 오늘만 실제 데이터, 나머지는 샘플 값)
* 감정 히스토리 분석
* 공유 기능 추가

---

## 📌 라이선스

본 프로젝트는 개인 학습 및 포트폴리오 목적으로 제작되었습니다.
