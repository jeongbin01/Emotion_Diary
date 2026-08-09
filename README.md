# 오늘의 하루

하루를 자유롭게 기록하면 AI가 감정을 분석해 오늘의 감정을 따뜻한 대시보드 형태로 보여주는 감정 일기 웹 애플리케이션입니다.

프론트엔드(Next.js)와 백엔드(FastAPI)가 분리된 구조입니다. FastAPI가 서빙하는 KcBERT가 감정의 극성(긍정·중립·부정)을 먼저 분류합니다. 그다음 33가지 세부 감정 분석은 두 갈래로 나뉩니다 — Gemini가 원인·심리 통찰·추천 활동까지 자유 서술로 생성하거나, 자체 학습한 FastText 다중 라벨 분류기가 CPU 연산만으로 33종 감정 라벨을 뽑아 템플릿 문장을 채웁니다. 어느 쪽을 탈지는 트래픽 비율로 조절할 수 있어서, Gemini 호출량을 의도적으로 줄이면 서비스 비용을 0에 가깝게 수렴시킬 수 있습니다. 분석 결과는 SQLAlchemy/Alembic으로 관리하는 DB에 영속 저장됩니다. 세 모델을 엮은 이유와, 실제로 측정한 토큰·비용 수치, 그 과정에서 마주친 트레이드오프를 이 문서에 정리했습니다.

---

## 기획 배경 및 목적

* 감정 일기는 자기 성찰에 효과적이라고 알려져 있지만, 매일 감정을 스스로 언어화하고 분류하는 데는 진입장벽이 있다.
* 사용자는 있었던 일을 편하게 적기만 하면, AI가 글 속 감정의 종류와 원인, 강도를 대신 분석해준다.
* "긍정/부정" 두 단어로 뭉뚱그리지 않고 33가지 세부 감정과 원인·심리 상태·성장 포인트까지 짚어, 하루를 더 깊이 들여다볼 수 있게 한다.
* 로컬 분류 모델(KcBERT)과 생성형 AI(Gemini)를 단계적으로 결합해, Gemini가 응답하지 않는 상황에서도 최소한의 감정 분석 결과를 돌려줄 수 있는 구조를 목표로 했다.
* 나아가 "Gemini 호출을 아예 줄이면 비용이 얼마까지 내려가는가"를 실제로 검증하기 위해, 33종 감정 분류를 CPU 전용 FastText 모델로 대체하는 경로를 직접 만들고 실측 토큰·비용 데이터로 비교했다.
* AI 오케스트레이션을 Next.js API Route(자식 프로세스 IPC)에서 FastAPI 백엔드(in-process 함수 호출 + Controller/Service/Repository 계층 분리)로 옮겨, 백엔드 아키텍처 역량을 보여줄 수 있는 표면을 확보했다. 자세한 설계 배경은 [docs/PORTFOLIO_REDESIGN.md](docs/PORTFOLIO_REDESIGN.md) 참고.

### 타겟 사용자

* 하루를 짧게라도 기록하고 싶지만 형식이나 분량 부담 때문에 일기를 잘 쓰지 못하는 사람
* 자신의 감정 패턴이나 원인을 객관적으로 들여다보고 싶은 사람
* 감정을 표현하는 데 서툴러서 AI의 분석을 통해 자신의 감정을 이해하고 싶은 사람
* 감정 일기 서비스를 사이드 프로젝트로 살펴보고 싶은 개발자·기획자

---

## 프로젝트 특징

* KcBERT(극성 분류) → Gemini(생성) 또는 FastText(무료 다중 라벨 분류) 3단계 감정 분석 파이프라인
* Gemini 응답 실패 시 FastText 기반 상세 분석으로 자동 Fallback (더 이상 극성 3종짜리 빈약한 대체가 아님)
* `GEMINI_TRAFFIC_RATIO` 환경 변수로 Gemini 호출 비율을 0~100% 사이에서 조절하는 비용 스위치
* Gemini 호출마다 실제 `usage_metadata`(토큰 수)를 읽어 비용을 계산·누적하고 `/api/v1/cost/stats`로 조회 가능
* FastAPI 부팅 시점(`lifespan`)에 KcBERT/FastText 모델을 한 번만 로딩해 요청마다 반복되는 모델 로딩 비용 제거 — 별도 자식 프로세스 없이 같은 프로세스 안의 함수 호출로 추론한다
* 일기와 분석 결과(토큰 수·비용·처리 시간 포함)를 SQLAlchemy + Alembic으로 관리하는 DB에 영속 저장
* Next.js는 프론트엔드 렌더링과 얇은 프록시 API Route만 담당하고, AI 오케스트레이션·비용 계산·DB 접근은 전부 FastAPI 백엔드(`backend/`)에 있다
* Apple Activity Ring 스타일의 감정 시각화, Warm Minimal 디자인 시스템

---

## 기술 선택과 이유

각 기술은 "많이 쓰이니까"가 아니라 이 프로젝트가 풀어야 할 구체적인 문제 때문에 골랐습니다.

### Next.js 16 (App Router)

프론트엔드 렌더링과 대시보드 UI를 담당합니다. AI 오케스트레이션은 더 이상 여기 없습니다 — [app/api/analyze/route.ts](app/api/analyze/route.ts)는 FastAPI 백엔드(`/api/v1/diaries`)로 요청을 전달하고 응답 모양만 맞춰주는 얇은 프록시입니다. 이 프록시를 남겨둔 이유는 두 가지입니다. `DiaryForm.tsx`의 `fetch('/api/analyze')` 호출 경로를 바꾸지 않아도 된다는 점, 그리고 브라우저가 FastAPI 서버 주소(`BACKEND_URL`)를 직접 알 필요가 없어 배포 시 백엔드 위치를 바꿔도 프론트 코드를 건드리지 않아도 된다는 점입니다.

### FastAPI (Python)

원래는 Next.js API Route가 자식 프로세스(`child_process.spawn`)로 Python 추론 서버를 띄우고 stdin/stdout으로 통신하는 구조였습니다. 이 구조를 FastAPI 단일 백엔드로 통합한 이유는 세 가지입니다.

1. **언어 경계 제거** — KcBERT/FastText(Python)를 Node에서 호출하려면 자식 프로세스 IPC가 필요했지만, 백엔드를 Python으로 통일하면 이 IPC 계층 자체가 사라지고 함수 호출로 대체됩니다([kcbert.py](backend/app/services/ai/kcbert.py), [fasttext_classifier.py](backend/app/services/ai/fasttext_classifier.py)).
2. **아키텍처 표면 확보** — Router([api/v1](backend/app/api/v1))/Service([services](backend/app/services))/Repository([repositories](backend/app/repositories)) 계층 분리, Pydantic 기반 요청/응답 검증, SQLAlchemy + Alembic 기반 DB 마이그레이션을 실제로 보여줄 수 있는 구조가 됩니다.
3. **AI 추론 서버로서의 적합성** — Pydantic이 Gemini `response_schema`와 거의 1:1로 대응되는 검증을 자체 제공하고([gemini_schema.py](backend/app/services/ai/gemini_schema.py)), `async def` 엔드포인트가 Gemini 호출(I/O 대기)과 KcBERT/FastText 추론(CPU 바운드, `asyncio.to_thread`로 위임)을 자연스럽게 분리해 처리합니다.

자세한 설계 배경(왜 Spring Boot/Express가 아닌지 포함)은 [docs/PORTFOLIO_REDESIGN.md §6](docs/PORTFOLIO_REDESIGN.md#6-기술-스택을-선택한-이유) 참고.

### React 19

`use client` 경계를 명시적으로 나누는 것 외에 이 프로젝트가 React 19의 신규 기능(Actions, `useOptimistic` 등)을 적극적으로 쓰고 있진 않습니다. Next 16의 기본 React 버전을 그대로 따라간 결정에 가깝습니다. 다만 클라이언트 상태가 [DiaryForm.tsx](app/components/DiaryForm.tsx) 한 곳에 몰려 있어, 상태 관리 라이브러리 없이도 `useState` 네 개(`text`, `result`, `error`, `loading`)로 충분했습니다.

### Tailwind CSS v4

디자인 토큰(`--bg`, `--card`, `--primary` 등)을 `globals.css`에 CSS 변수로 두고, 컴포넌트에서는 유틸리티 클래스로 소비하는 구조를 원했습니다. 카드형 컴포넌트가 12개 가까이 반복되는 프로젝트 특성상, 매번 별도 CSS 모듈을 만드는 것보다 `.ds-card` 같은 공통 유틸리티 클래스를 정의해두고 재사용하는 쪽이 유지보수 비용이 낮았습니다.

### 모델 상주 방식: 자식 프로세스 대신 FastAPI lifespan

KcBERT는 PyTorch/Transformers 기반이라 Python 런타임이 필요합니다. 선택은 두 가지였습니다 — 요청마다 모델을 새로 로딩하거나, 한 번만 로딩한 뒤 계속 재사용하거나. 전자는 매 요청마다 BERT 모델(약 400MB)을 디스크에서 읽고 초기화하는 비용을 반복해서 지불합니다. 초기 버전(Next.js)에서는 Node의 전역 객체에 자식 프로세스를 캐싱해두고 서버 부팅 시점에 예열하는 방식을 썼지만, 지금은 FastAPI의 `lifespan` 이벤트([main.py](backend/app/main.py))에서 `get_kcbert_classifier()`/`get_fasttext_classifier()`(`functools.lru_cache`)를 한 번만 호출해 같은 목적을 프로세스 경계 없이 달성합니다.

### KcBERT

한국어 구어체·신조어에 강한 사전학습 모델이라는 점, 그리고 감정 극성 3클래스 분류라는 좁은 문제에 파인튜닝하기 적합한 크기라는 점이 이유입니다. Gemini 하나로도 극성 분류는 가능하지만, 매 요청마다 외부 API를 호출해 "지금 이 글이 긍정인지 부정인지"만 물어보는 건 비용과 지연 시간 모두 낭비입니다. 로컬 모델로 먼저 걸러낼 수 있는 문제는 로컬에서 끝내는 편이 낫다고 판단했습니다.

### Gemini 2.5 Flash

33가지 세부 감정, 원인 추론, 심리 통찰, 추천 활동 생성처럼 열린 형태의 자연어 생성은 규칙 기반이나 분류 모델로 대체하기 어렵습니다. Flash 계열을 고른 이유는 이 서비스의 응답 하나가 12개 필드(라벨, 감정 배열, 원인, 키워드, 코멘트 등)를 한 번에 채워야 해서 응답 지연이 곧바로 체감 로딩 시간이 되기 때문입니다. Pro 대비 지연 시간과 비용에서 이점이 있고, 이 작업은 복잡한 추론보다 "정해진 스키마를 자연스러운 문장으로 채우는" 일에 가까워 Flash로도 충분했습니다.

다만 Gemini 2.5 Flash는 2026-10-16 지원 종료가 예고되어 있어([가격 페이지](https://ai.google.dev/gemini-api/docs/pricing) 기준), 모델 교체가 예정된 의존성이라는 점도 감안해야 합니다. 아래 FastText 경로가 "Gemini가 없어도 서비스가 돌아가는" 구조를 미리 검증해두는 이유이기도 합니다.

### FastText (33종 세부 감정 다중 라벨 분류)

KcBERT로 3-class 극성 분류를 로컬에서 끝내는 것과 같은 발상을, 33종 세부 감정 단계까지 넓힌 것입니다. "이 일기가 어떤 감정 라벨에 해당하는가"는 원인 추론이나 통찰 문장 생성과 달리 닫힌 다중 라벨 분류 문제라, 매번 Gemini에게 물어볼 필요가 없다고 판단했습니다.

문제는 라벨링된 한국어 감정 일기 데이터셋이 없다는 점이었습니다. 그래서 33종 감정마다 대표 키워드·문장 시드를 직접 만들고([emotion_keywords.py](backend/training/emotion_keywords.py)), 이를 템플릿에 채워 학습 코퍼스를 합성하는 weak-supervision 방식으로 부트스트랩했습니다([train_fasttext.py](backend/training/train_fasttext.py)). FastText를 고른 이유는 세 가지입니다.

1. **가볍다** — 학습된 모델(quantize 적용)이 2.4MB로, KcBERT(415MB)의 약 1/170 크기입니다. GPU는커녕 별도 스레드 튜닝도 필요 없을 만큼 가벼워 상주 프로세스 메모리 부담이 거의 없습니다.
2. **빠르다** — 문자 n-gram 기반 얕은 선형 모델이라 학습에 1초 남짓, 추론은 밀리초 단위입니다. BERT 계열처럼 토크나이저 로딩·행렬 연산 비용을 감내할 필요가 없습니다.
3. **다중 라벨을 자연스럽게 지원한다** — `loss=ova`(One-vs-All)로 학습하면 감정마다 독립적인 확률을 얻을 수 있어, "설렘이면서 동시에 긴장됨" 같은 복합 감정을 하나의 정답만 강제하는 소프트맥스보다 자연스럽게 표현합니다.

검증셋(합성 데이터 기준) precision@1 ≈ 0.95, recall@1 ≈ 0.81입니다. 다만 이 수치는 템플릿으로 만든 문장에 대한 자체 검증이라 실제 서비스 정확도를 보장하지 않습니다 — 자세한 한계는 아래 [알려진 제한사항](#알려진-제한사항)에 정리했습니다.

---

## Technical Decisions

기술을 고른 이유보다 더 중요한 건 그 기술들을 어떻게 엮었는가였습니다. 실제로 개발하면서 부딪힌 선택지들입니다.

### Gemini만 쓰지 않은 이유

처음에는 KcBERT 없이 Gemini 하나로 감정 분석 전체를 처리하는 구조도 고려했습니다. 하지만 두 가지가 걸렸습니다.

1. **비용** — 3클래스 극성 분류처럼 단순한 판단까지 매번 생성형 모델을 거치면, 트래픽이 늘었을 때 비용이 요청 수에 그대로 비례합니다.
2. **가용성** — Gemini API가 실패하거나 키가 없을 때 서비스 전체가 멈추는 구조는 감정 일기라는 서비스 특성상 위험합니다. 사용자가 힘든 하루를 기록했는데 "분석에 실패했습니다"만 보여주는 건 최악의 실패 모드입니다.

그래서 극성 분류는 로컬 모델이 담당하고, Gemini는 그 위에 얹는 생성 레이어로 역할을 나눴습니다. 처음에는 "Gemini가 없으면 극성 + 기본 위로 메시지"라는 최소한의 응답만 목표로 했는데, 실제로 트래픽이 늘어난다고 가정하고 비용을 계산해보니(아래 [Cost Optimization](#cost-optimization) 참고) 이 최소 응답 경로를 아예 상시로 승격시킬 가치가 있다는 결론에 도달했습니다. 그래서 FastText로 33종 세부 감정까지 로컬에서 분류하도록 확장해, "비상시에만 쓰는 초라한 대체재"가 아니라 "의도적으로 트래픽을 몰아줄 수 있는 저비용 정식 경로"로 만들었습니다.

### FastText 경로는 언제 타는가

[emotion_analysis.py](backend/app/services/emotion_analysis.py)의 `EmotionAnalysisService.analyze()`가 매 요청마다 다음 순서로 엔진을 정합니다.

1. `EMOTION_ENGINE=fasttext`이면 무조건 로컬 경로. Gemini API를 아예 호출하지 않는다.
2. 그렇지 않으면 `GEMINI_TRAFFIC_RATIO`(기본값 1, 즉 100%) 확률로 Gemini를 시도한다. 예를 들어 `0.3`으로 설정하면 요청의 30%만 Gemini로 가고 나머지 70%는 처음부터 FastText로 간다.
3. Gemini를 시도했는데 API 키가 없거나 호출이 실패하면(`GeminiClientError`), 그 요청 역시 FastText 경로로 떨어진다.

세 경로 모두 최종적으로 같은 함수(`create_local_detailed_result`)를 호출합니다. "비용을 줄이려고 의도적으로 로컬 경로를 택한 경우"와 "Gemini가 실패해서 어쩔 수 없이 로컬 경로로 떨어진 경우"를 코드 상에서 분기하지 않고 하나로 합친 이유는, 사용자 입장에서는 두 경우 모두 "무료 경로에서 나온 결과"라는 사실이 같고, 결과 품질도 동일해야 한다고 판단했기 때문입니다. 이 라우팅 로직은 Gemini·랜덤 함수를 주입해 결정론적으로 단위 테스트합니다([test_emotion_analysis_service.py](backend/tests/test_emotion_analysis_service.py)).

### KcBERT를 먼저 수행하는 이유

순서를 바꿔서 Gemini가 먼저 세부 감정을 생성하고 KcBERT로 검증하는 방식도 가능은 합니다. 하지만 그러면 Gemini 호출이 실패했을 때 아무 결과도 남지 않습니다. KcBERT를 먼저 실행하면 이 결과 하나만으로도 항상 응답 가능한 기반선(baseline)을 확보할 수 있고, 이 값을 Gemini 프롬프트에 참고 정보로 함께 넘겨 두 모델의 판단이 크게 어긋나지 않도록 유도할 수 있습니다([gemini_client.py](backend/app/services/ai/gemini_client.py)의 `classify_with_gemini(text, base_label, api_key)`).

### 모델 상주 — 자식 프로세스 IPC 대신 in-process 함수 호출

Next.js 버전에서는 `child_process.spawn`으로 Python 프로세스를 띄우고 `stdin`으로 JSON을 한 줄씩 밀어넣고 `stdout`에서 한 줄씩 읽어 큐에 순서대로 매칭하는 프로토콜을 직접 짰습니다. 백엔드를 FastAPI(Python)로 통일하면서 이 프로토콜 자체가 필요 없어졌습니다 — [kcbert.py](backend/app/services/ai/kcbert.py)/[fasttext_classifier.py](backend/app/services/ai/fasttext_classifier.py)가 `functools.lru_cache`로 모델을 프로세스당 한 번만 로딩해두고, 요청마다 그냥 함수를 호출합니다. "프로세스 IPC를 없애는 것"이 이번 재설계의 핵심 통찰이었습니다(자세한 배경은 [docs/PORTFOLIO_REDESIGN.md §6](docs/PORTFOLIO_REDESIGN.md#6-기술-스택을-선택한-이유)).

### 얇은 프록시를 남긴 이유

브라우저가 FastAPI를 직접 호출하지 않고 Next.js [app/api/analyze/route.ts](app/api/analyze/route.ts)를 거치게 한 이유는, 프론트 코드([DiaryForm.tsx](app/components/DiaryForm.tsx))가 백엔드 서버 주소를 몰라도 되게 하기 위해서입니다. `GEMINI_API_KEY`는 이제 Next.js에도 없고 오직 `backend/.env`에만 있어, 애초에 브라우저나 Next.js 서버로 노출될 경로 자체가 없습니다.

### Prompt Engineering

Gemini에게 완전히 자유로운 감정 라벨을 생성하게 하면 `emotion-theme.ts`(그리고 이를 그대로 옮긴 [emotion_labels.py](backend/app/services/ai/emotion_labels.py))에 정의되지 않은 라벨이 튀어나올 수 있고, 그러면 색상·아이콘 매핑이 깨집니다. 그래서 프롬프트에 KcBERT의 극성 결과를 참고 자료로 명시하고("간단한 감정 분류 모델은 이 일기를 '${base_label}' 계열로 예측했습니다"), Pydantic `Enum` 필드로 33가지 감정 라벨 밖의 값은 애초에 생성 후보에서 배제했습니다([gemini_schema.py](backend/app/services/ai/gemini_schema.py)). `aiOneLiner`는 15~35자·마침표 하나·줄바꿈 없음까지 제약을 걸었는데, 이건 UI 카드 한 줄에 들어가야 하는 실제 레이아웃 제약에서 역산한 값입니다.

### Structured Output을 사용한 이유

초기에는 Gemini에게 자연어로 답하게 하고 정규식이나 문자열 파싱으로 필드를 뽑아내는 방식도 생각했지만, 필드가 12개(라벨, 신뢰도, 감정 배열, 원인, 키워드, 심리 상태, 성장 포인트, 활동 등)나 되면 파싱이 깨지는 지점이 계속 늘어납니다. `google-genai` SDK에 Pydantic 모델(`GeminiAnalysisSchema`)을 `response_schema`로 그대로 넘기면 SDK가 JSON Schema를 자동 생성하고, `response.parsed`로 이미 그 타입으로 검증된 인스턴스를 바로 돌려줍니다 — TS 버전의 `responseSchema` + `JSON.parse` 두 단계가 SDK 내부로 흡수된 것뿐, 검증 강도는 동일합니다.

### 실패 처리

`response_schema`가 필드 형태와 enum 값은 보장하지만, API 자체가 실패하거나(네트워크 오류, 콘텐츠 차단 등) `response.parsed`가 `None`인 경우까지 막아주지는 않습니다. 그래서 [gemini_client.py](backend/app/services/ai/gemini_client.py)의 `classify_with_gemini` 전체를 `try/except`로 감싸 `GeminiClientError` 하나로 통일해서 던지고, `EmotionAnalysisService`가 이 예외 한 지점만 잡아 Fallback으로 넘깁니다.

### Fallback을 만든 이유

Gemini 키가 없거나 호출이 실패해도 사용자는 "오늘 자신이 어떤 감정이었는지"에 대한 답은 받아야 한다고 판단했습니다. 초기 버전은 KcBERT의 극성(`긍정`/`중립`/`부정`) 하나로만 기본 위로 메시지를 채웠는데, 이러면 대표 감정이 항상 세 가지 중 하나로 뭉뚱그려져 서비스의 핵심 가치(33가지 세부 감정 분석)가 사라진 반쪽짜리 응답이 됩니다.

지금의 `create_local_detailed_result`([emotion_analysis.py](backend/app/services/emotion_analysis.py))는 여기에 FastText의 33종 다중 라벨 분류 결과를 얹습니다. 상위 감정 1~5개와 각각의 점수를 받아 `causes`(감정별 비중), `keywords`, `ai_one_liner`/`ai_message`(대표 감정 + 2번째 감정을 함께 언급)까지 라벨 조합만으로 채웁니다. 추천 활동은 여전히 극성별 고정 리스트(`FALLBACK_ACTIVITIES`)를 쓰는데, "산책 10분" 같은 활동 추천은 세부 감정보다 극성 단위로 나눠도 자연스러워서 굳이 33종별로 쪼갤 필요가 없다고 판단했습니다. Gemini만큼 자유도 높은 문장은 못 만들지만, 최소한 "어떤 감정이었는지"는 Gemini 없이도 꽤 구체적으로 답할 수 있습니다.

---

## AI Pipeline

```mermaid
flowchart TD
    A["사용자 입력<br/>일기 텍스트 (10자 이상)"] --> B["Next.js /api/analyze<br/>(얇은 프록시)"]
    B --> B2["FastAPI POST /api/v1/diaries"]
    B2 --> C["텍스트 전처리<br/>tokenizer(text, max_length=300, truncation=True)"]
    C --> D["KcBERT + FastText 동시 추론<br/>(in-process, asyncio.to_thread)"]
    D --> E["KcBERT: 긍정 · 중립 · 부정 + Confidence"]
    D --> F["FastText: 33종 세부 감정<br/>다중 라벨 + 점수 (threshold=0.3)"]
    E --> G{"EMOTION_ENGINE=fasttext ?<br/>또는 random() ≥ GEMINI_TRAFFIC_RATIO ?"}
    F --> G
    G -->|"Yes<br/>(비용 절감 경로)"| H["create_local_detailed_result<br/>FastText 라벨 → 템플릿 문장 생성, $0"]
    G -->|"No"| I["Gemini Prompt 생성<br/>KcBERT 결과를 참고 정보로 포함"]
    I --> J["Gemini 2.5 Flash<br/>response_schema(Pydantic) 호출"]
    J --> K{"호출 성공 &<br/>response.parsed 존재?"}
    K -->|"No<br/>(키 없음/API 실패)"| H
    K -->|"Yes"| L["12개 필드 매핑 +<br/>usage_metadata로 실비용 계산·누적"]
    H --> M["EmotionAnalysisRepository.save()<br/>engine · token · cost · latency 기록"]
    L --> M
    M --> N["Response JSON<br/>engine: 'fasttext' | 'gemini'"]
    N --> O["Next.js가 emotionAnalysis만 추출해 전달"]
    O --> P["대시보드 렌더링<br/>Ring · Donut · Line Chart"]
```

파이프라인의 핵심은 세 가지입니다. 첫째, KcBERT와 FastText는 같은 프로세스에서 매 요청마다 항상 함께 돈다는 것 — 그래서 Gemini 분기 결과와 무관하게 `detailedEmotions`가 항상 채워집니다. 둘째, 어느 단계에서 실패하든(`G`의 비용 스위치든 `K`의 Gemini 실패든) `M` 이전에 항상 FastText 기반 응답(`H`)으로 합류한다는 것입니다. 셋째, 결과가 매번 사라지지 않고 DB에 저장된다는 것 — Next.js 버전에는 없던 단계입니다.

---

## 시스템 아키텍처

```mermaid
flowchart LR
    U["사용자 브라우저"] -->|"일기 텍스트 POST"| PROXY["Next.js API Route<br/>/api/analyze (얇은 프록시)"]
    PROXY -->|"fetch(BACKEND_URL)"| API["FastAPI<br/>/api/v1/diaries"]
    API --> SVC["EmotionAnalysisService<br/>엔진 선택 오케스트레이션"]
    SVC --> AI["KcBERT + FastText<br/>(같은 프로세스, in-process)"]
    SVC -->|"비용 스위치 통과 시"| GEMINI["Google Gemini API<br/>gemini-2.5-flash"]
    SVC -->|"비용 계산·누적"| COST["cost_tracking.py<br/>인메모리 비용 집계"]
    COST -->|"GET"| STATS["/api/v1/cost/stats"]
    SVC --> REPO["DiaryRepository"]
    REPO --> DB[("SQLite / PostgreSQL")]
    API -->|"분석 결과 JSON<br/>engine 필드 포함"| PROXY
    PROXY -->|"emotionAnalysis만 추출"| U
```

**왜 백엔드를 Python으로 통일했는가** — Node.js에는 PyTorch/Transformers 생태계가 없습니다. 이전에는 KcBERT를 자식 프로세스로 붙여 이 문제를 우회했지만, 그러면 Next.js 서버와 Python 프로세스가 같은 호스트·같은 생명주기를 공유해야 한다는 제약이 생깁니다. 백엔드를 FastAPI(Python)로 통일하면 이 제약 자체가 사라지고, KcBERT·FastText·Gemini 호출이 전부 같은 프로세스 안의 함수 호출이 됩니다.

**왜 Next.js에 프록시를 남겼는가** — 브라우저가 FastAPI를 직접 호출하지 않고 `/api/analyze`를 거치게 한 이유는, 프론트가 백엔드 서버 주소를 몰라도 되게 하기 위해서입니다. `GEMINI_API_KEY`는 이제 `backend/.env`에만 있어 Next.js 서버조차 이 값을 갖고 있지 않습니다.

**왜 모델을 in-process로 로딩하는가** — 요청마다 모델을 다시 로딩하는 비용을 없애기 위함입니다(위 Technical Decisions 참고). FastText도 같은 이유로 같은 프로세스 안에 얹었습니다 — 별도 프로세스로 분리하면 IPC 비용과 프로세스 관리 복잡도만 늘고, 어차피 KcBERT가 상주하는 동안 함께 상주시키는 데 드는 메모리 비용은 무시할 수준(2.4MB)이기 때문입니다.

**왜 비용 집계를 Service 계층 안에 두는가** — Gemini 호출 성공 시 `response.usage_metadata`를 읽을 수 있는 지점이 `classify_with_gemini` 내부뿐이라, 비용 계산도 그 자리에서 바로 하는 게 자연스럽습니다. [cost_tracking.py](backend/app/services/cost_tracking.py)는 이 계산 로직과 인메모리 누적 통계를 분리해두고, `/api/v1/cost/stats`가 그 값을 그대로 노출합니다. 서버 프로세스가 재시작되면 통계도 초기화되는 휘발성 집계라, 영구 기록은 `EmotionAnalysis` 테이블의 `input_tokens`/`output_tokens`/`cost_usd` 컬럼에 이미 쌓이고 있습니다(DB 기반 집계 대시보드는 아직 미구현, 아래 향후 계획 참고).

---

## Frontend Architecture

### Component Design

컴포넌트는 대시보드를 구성하는 카드 단위로 쪼갰습니다(`EmotionRingCard`, `EmotionSummaryCard`, `CauseDonutChart`, `WeeklyTrendChart` 등). API 응답 하나가 12개 필드를 갖고 있는데, 이걸 하나의 큰 컴포넌트에서 다 그리면 특정 필드 렌더링 방식이 바뀔 때마다 전체 컴포넌트를 건드려야 합니다. 카드 단위로 나누면 "감정 원인 시각화 방식을 도넛에서 바 차트로 바꾼다" 같은 변경이 `CauseDonutChart.tsx` 한 파일 안에서 끝납니다.

### 왜 Card 기반 UI인가

분석 결과가 성격이 다른 정보(오늘의 대표 감정, 원인 비중, 7일 추이, 추천 활동, 응원 문장)의 묶음이라, 이걸 한 화면에 흘려보내는 것보다 정보 단위별로 카드에 나눠 담는 편이 사용자가 필요한 정보만 골라 보기 쉽습니다. 카드 경계가 곧 컴포넌트 경계이기도 해서, 위 컴포넌트 분리 기준과도 맞아떨어집니다.

### 왜 Activity Ring을 사용했는가

오늘의 대표 감정과 신뢰도라는 두 값을 하나의 시각 요소로 압축해서 보여줘야 했습니다. 막대나 숫자 카드 대신 원형 진행률을 고른 이유는, "오늘 하루가 얼마나 그 감정으로 채워졌는가"라는 감각적인 정보를 전달하는 데 원형 진행률이 숫자 나열보다 직관적이라고 판단했기 때문입니다. Apple의 Activity Ring이 이미 검증한 패턴이기도 합니다.

### 왜 Warm Minimal인가

감정 일기는 매일 열어보는 서비스라, 화면이 자극적이거나 차가우면 기록하는 행위 자체에 대한 심리적 장벽이 생깁니다. `#F8F4EE` 배경과 보라 포인트 컬러(`#8B74D9`), 여백을 넉넉히 둔 카드 레이아웃으로 채도를 낮추고, 일기 입력창과 결과 카드에는 줄노트 배경(`notepad-lines`)과 손글씨 폰트(Gaegu)를 적용해 실제 노트에 쓰는 감각에 가깝게 만들었습니다.

### State Flow

전역 상태 관리 라이브러리를 쓰지 않았습니다. 페이지가 사실상 하나(`DiaryForm`)이고, 입력 → 분석 요청 → 결과 렌더링이라는 선형 흐름 안에서만 상태가 움직이기 때문입니다. `text`(입력값), `result`(분석 결과), `error`, `loading` 네 개의 `useState`로 전체 화면 상태를 표현하고, `result`가 채워지면 조건부로 대시보드 카드들이 렌더링되는 구조입니다. 결과와 일기 원문은 컴포넌트 state에만 존재하며 서버나 브라우저에 저장하지 않습니다(새로고침·'다시 쓰기' 시 초기화).

### Directory Structure

아래 [프로젝트 구조](#프로젝트-구조) 참고.

---

## Scalability

현재 구조는 단일 세션·단일 서버를 전제로 만들었습니다. 트래픽이 늘어난다면 다음 지점부터 병목이 생길 것으로 예상합니다.

* **FastAPI 단일 프로세스** — 지금은 `uvicorn` 워커 하나가 KcBERT/FastText 모델을 메모리에 들고 모든 요청을 처리합니다. CPU 바운드 추론은 `asyncio.to_thread`로 스레드풀에 위임해 이벤트 루프는 막지 않지만, 동시 요청이 늘면 결국 이 스레드풀이 병목이 됩니다. `uvicorn --workers N`으로 워커를 늘리거나(모델을 워커마다 중복 로딩하는 비용은 감수), 추론 전용 마이크로서비스로 다시 분리해 API 서버와 독립적으로 스케일하는 방향이 다음 단계입니다. Next.js와의 결합은 이미 풀려 있어(별도 프로세스, `BACKEND_URL`로만 연결) 이 확장은 프론트를 건드리지 않고 백엔드만 바꾸면 됩니다.
* **Gemini 호출 비용과 지연** — 요청마다 Gemini를 호출하는 구조라 트래픽이 늘면 비용이 요청 수에 선형으로 비례합니다. 실측 수치와 완화 방법은 아래 [Cost Optimization](#cost-optimization) 참고.
* **캐싱** — 같은 문장을 두 번 분석할 일은 거의 없어서 응답 캐싱의 효용은 낮지만, 동일 사용자가 짧은 시간에 '다시 쓰기'를 반복하는 패턴이 나온다면 최근 KcBERT 결과 정도는 캐싱할 여지가 있습니다.
* **Fallback을 상시 저비용 경로로 승격** — 처음엔 아이디어 수준이었는데, 실제로 `GEMINI_TRAFFIC_RATIO`라는 환경 변수로 구현했습니다. Gemini 실패 시에만 쓰던 극성 3종 고정 템플릿을, FastText 다중 라벨 분류 기반으로 확장해 "일정 비율의 요청을 상시 처리하는 저비용 경로"로 만들었습니다. 자세한 동작은 위 [FastText 경로는 언제 타는가](#fasttext-경로는-언제-타는가) 참고.
* **모델 교체 가능성** — 파이프라인이 "텍스트 → 라벨 + 신뢰도"라는 인터페이스(`KcBertLike`/`FastTextLike` `Protocol`, [emotion_analysis.py](backend/app/services/emotion_analysis.py))로 KcBERT와 분리돼 있어, 같은 인터페이스만 지키면 모델을 교체할 수 있습니다. 이 인터페이스 덕분에 단위 테스트에서도 실제 모델 대신 가짜 구현을 주입해 결정론적으로 검증합니다. 지금 FastText로 33종 세부 감정까지 로컬 분류로 옮긴 게 이 인터페이스를 활용한 실제 사례입니다. 더 정교한 한국어 이해가 필요하면 KoBERT, 세부 감정 생성까지 로컬로 옮기고 싶다면 Llama/Gemma 계열의 소형 파인튜닝 모델로 교체하는 것도 구조상 가능합니다. 다만 Gemini의 자유 서술 필드(원인·통찰·성장 포인트)까지 완전히 대체하려면 지금의 `response_schema` 기반 구조화 출력을 자체적으로 구현해야 합니다.
* **Batch 처리** — 현재는 요청 하나당 추론 하나입니다. 동시 요청이 많아지면 KcBERT 추론을 짧은 시간 단위로 모아 배치로 처리해 GPU/CPU 활용도를 높이는 방식도 고려 대상입니다.

---

## Cost Optimization

여기 적힌 수치는 전부 실제로 로컬에서 `/api/analyze`를 호출해 측정한 값입니다(2026-08-09, 가격은 [Gemini API 공식 가격표](https://ai.google.dev/gemini-api/docs/pricing) 기준 Gemini 2.5 Flash `$0.30`/1M input tokens, `$2.50`/1M output tokens). "감이 아니라 계산"이 목표였습니다.

### 요청 1건당 실제 비용

같은 일기 텍스트로 두 가지 설정을 비교했습니다.

| 설정 | Input 토큰 | Output 토큰(thinking 포함) | 요청당 비용 |
| -- | --: | --: | --: |
| 기본 설정 (thinking 켜짐) | 269 | 2,334 | $0.005916 |
| `thinkingConfig.thinkingBudget: 0` | 269 | 344 | **$0.000941** |

이 서비스는 "정해진 스키마를 정해진 33개 라벨 안에서 채우는" 닫힌 문제라(원인 추론이라기보다는 구조화 추출에 가까움), Gemini가 응답 전에 내부적으로 여러 번 초안을 굴려보는 thinking 단계의 효용이 낮다고 판단해 `thinking_budget=0`으로 껐습니다([gemini_client.py](backend/app/services/ai/gemini_client.py)). 실측 결과 출력 토큰이 2,334 → 344로 줄면서 **요청당 비용이 약 6.3배 절감**됐습니다. 결과 문장의 다양성이 눈에 띄게 떨어지면 다시 켤 수 있는 지점으로 코드에 남겨뒀습니다. 이 비용 계산식 자체는 백엔드 이관 후에도 [test_cost_tracking.py](backend/tests/test_cost_tracking.py)에서 269/344 토큰 조합이 실측값 $0.000941을 그대로 재현하는지 검증합니다.

### 월간 비용 추정 (하루 1회 기록 기준)

일 활성 사용자(DAU) 수별로, 위에서 실측한 요청당 $0.000941을 그대로 곱한 값입니다.

| DAU | 월간 요청 수 | Gemini 100% 사용 시 월 비용 |
| --: | --: | --: |
| 100 | 3,000 | $2.82 |
| 1,000 | 30,000 | $28.22 |
| 10,000 | 300,000 | $282.21 |
| 100,000 | 3,000,000 | $2,822.10 |

### FastText 경로로 트래픽을 돌리면 얼마까지 내려가는가

`GEMINI_TRAFFIC_RATIO`를 낮추면 그 비율만큼 요청이 FastText 경로로 빠지고, 그 요청은 과금이 0입니다. DAU 10,000명 기준으로 비율별 월 비용은 다음과 같습니다.

| GEMINI_TRAFFIC_RATIO | Gemini 비율 | 월 비용 (DAU 10,000) |
| --: | --: | --: |
| 1.0 (기본값) | 100% | $282.21 |
| 0.5 | 50% | $141.11 |
| 0.1 | 10% | $28.22 |
| 0.0 | 0% | **$0.00** |

`0.0`은 `EMOTION_ENGINE=fasttext`로 강제한 것과 동일한 결과입니다 — API 키가 있어도 Gemini를 아예 호출하지 않으므로 유지비가 CPU 연산 비용(서버 리소스 점유) 하나로 수렴합니다. 실제로 어느 비율을 쓸지는 "Gemini 품질이 꼭 필요한 트래픽이 얼마나 되는가"에 달린 제품 판단의 영역이라, 이 프로젝트에서는 기본값을 1로 두고 필요시 낮추는 스위치로만 남겨뒀습니다.

### 로컬 모델 두 개의 비용 특성 비교

| | KcBERT (극성 3-class) | FastText (세부 감정 33-class) |
| -- | -- | -- |
| 모델 크기 | 415.6MB | 2.4MB (quantize 적용, 약 1/171) |
| 런타임 | PyTorch, Transformers | 순수 CPU 선형 모델 |
| 학습 데이터 | 라벨링된 데이터셋으로 파인튜닝 | 키워드 시드 기반 weak-supervision 합성 데이터 |
| 요청당 과금 | $0 (로컬 추론) | $0 (로컬 추론) |
| 정확도 | (파인튜닝 데이터셋 기준, 이 저장소 범위 밖) | 자체 검증셋 precision@1 ≈ 0.95, recall@1 ≈ 0.81 |

FastText 쪽 정확도는 사람이 라벨링한 데이터가 아니라 템플릿으로 합성한 문장에 대한 자체 검증이라, 실 서비스 정확도를 보장하지 않는다는 점을 감안해야 합니다. "돈을 아예 안 쓰고도 어느 정도 쓸모 있는 결과를 낼 수 있는가"를 검증하는 첫 단계로 만든 것이고, 실 트래픽이 쌓이면 실제 일기 텍스트(익명화) + 사람 검수 라벨로 재학습하는 게 다음 단계입니다.

### 종합

* Gemini만 쓰는 구조라면 DAU 10,000명 기준 월 $282.21 (thinking을 끄지 않았다면 $1,774.71).
* `GEMINI_TRAFFIC_RATIO`를 조절하면 이 비용을 품질과 맞바꿔 원하는 지점까지 낮출 수 있고, 극단적으로는 $0까지 수렴시킬 수 있다.
* CPU 추론(KcBERT + FastText)은 요청량과 무관하게 과금되지 않지만, 서버 리소스(CPU/메모리)는 계속 점유한다. 트래픽이 늘어 지연 시간이 문제가 되기 전까지는 GPU 인스턴스 비용을 들일 이유가 없다고 판단했다.

---

## 주요 기능

### 감정 일기 작성

* 하루 동안 있었던 일을 자유롭게 기록 (10자 이상)
* 실제 공책처럼 줄노트 배경과 빨간 여백선이 있는 입력창
* Gaegu 손글씨 폰트로 직접 쓴 듯한 느낌

### AI 감정 분석

* KcBERT 기반 1차 극성 분석(긍정·중립·부정)
* Gemini가 일기 내용을 바탕으로 33가지 세부 감정 중 최대 5개를 강도순으로 생성
* 감정 원인과 비중, 상황 키워드, 심리 상태 통찰, 성장 포인트, 내일의 나에게 보내는 응원, 추천 활동 4가지, 오늘의 응원 문장까지 한 번에 생성
* AI 한 줄 분석(요약 카드)과 AI 코멘트(2~3문장, 코멘트 카드)를 분리해 표시
* `GEMINI_API_KEY`가 없거나 Gemini 호출이 실패하면, 또는 비용 절감을 위해 `GEMINI_TRAFFIC_RATIO`를 낮춰뒀다면 FastText가 분류한 33종 세부 감정과 위로 메시지·추천 활동으로 자동 대체 (비용 $0)

### 오늘의 감정 대시보드

* Apple Activity Ring 스타일 원형 진행률로 오늘의 대표 감정과 신뢰도 표시
* 감정 요약 카드에 감정 강도(5점 척도), AI 한 줄 분석, 오늘의 키워드
* 감정 분포 TOP3, 감정 원인 도넛 차트, 최근 7일 감정 변화 라인 차트
* AI 추천 활동, 오늘의 문장, 감정 분석 상세(심리 상태·주요 원인·성장 포인트·내일의 나에게) 카드

> ⚠️ 감정 기록을 저장하는 데이터베이스가 아직 없어, 새로고침하거나 '다시 쓰기'를 누르면 결과가 사라집니다. 최근 7일 감정 변화 그래프와 EmotionRingCard의 '어제보다 +N%' 배지는 히스토리 저장 기능이 붙기 전까지 오늘(일요일 자리) 외에는 샘플 값을 사용합니다.

---

## 화면 흐름

```mermaid
flowchart TD
    A["입력 화면<br/>오늘 하루 어땠나요?"] -->|"10자 이상 입력 후<br/>'오늘의 감정 기록하기'"| B["분석 중<br/>로딩 스피너"]
    B --> C{"비용 스위치 통과 &<br/>Gemini API 사용 가능?"}
    C -->|"Yes"| D["KcBERT 극성 분석 +<br/>Gemini 세부 감정/통찰 생성"]
    C -->|"No / 실패"| E["KcBERT 극성 분석 +<br/>FastText 세부 감정 분류 (무료)"]
    D --> F["감정 대시보드 렌더링"]
    E --> F
    F -->|"'다시 쓰기'"| A
```

* 단일 페이지 애플리케이션(SPA) 구조로, 입력 → 분석 → 결과 표시가 한 화면 안에서 전환된다.
* 별도의 로그인·회원가입 없이 바로 사용할 수 있다.
* 분석 결과와 일기 원문은 서버나 브라우저에 저장되지 않으며, 새로고침하거나 '다시 쓰기'를 누르면 초기화된다.

---

## 기술 스택

| 분야 | 기술 |
| -- | -- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, lucide-react |
| Backend | FastAPI, Python 3.11, Pydantic v2, SQLAlchemy 2.0 (async) + Alembic |
| Database | SQLite (로컬 개발) / PostgreSQL (배포 전제) |
| AI | KcBERT-base (PyTorch, Transformers), FastText (CPU 다중 라벨 분류), Google Gemini API (`google-genai`, `gemini-2.5-flash`) |
| Design | Pretendard, Gaegu, Warm Minimal Design System |

---

## 실행 방법

프론트(Next.js)와 백엔드(FastAPI)를 각각 독립 프로세스로 띄워야 합니다. AI 모델·`GEMINI_API_KEY`·비용 계산·DB는 전부 백엔드 쪽에 있으므로, **백엔드를 먼저 띄우는 순서**를 권장합니다.

### 1. 백엔드 (FastAPI)

```bash
cd backend
pip install -e ".[dev]"          # FastAPI, SQLAlchemy, torch, google-genai 등 (backend/pyproject.toml)
python -m alembic upgrade head   # SQLite에 users/diaries/emotion_analyses 테이블 생성
python -m uvicorn app.main:app --reload
```

> `backend/models/kcbert/`(KcBERT, `model.safetensors` 약 400MB)는 Git LFS로 포함되어 있어 별도 다운로드가 필요하지 않습니다. 저장소를 클론하기 전에 [Git LFS](https://git-lfs.com)가 설치되어 있어야 합니다(`git lfs install` 후 clone, 또는 클론 후 `git lfs pull`).
>
> `fasttext`(공식 PyPI 패키지)는 Windows에서 빌드 도구 없이는 설치가 잘 안 돼서, 미리 컴파일된 wheel을 제공하는 `fasttext-wheel`을 대신 씁니다.
>
> `backend/models/fasttext/emotion_ft.bin`(33종 세부 감정 분류기, 약 2.4MB)은 저장소에 이미 포함돼 있어 바로 쓸 수 있습니다. 키워드 시드나 학습 파라미터를 바꿔 재학습하고 싶다면 `backend/training/`에서 `python train_fasttext.py`를 실행하면 됩니다(수 초 내로 끝나고, `backend/models/fasttext/emotion_ft.bin`을 덮어씁니다).

`backend/.env` 파일을 만들어 환경 변수를 설정합니다.

```env
GEMINI_API_KEY=your_gemini_api_key_here

# 선택. Gemini 호출 비율(0~1). 기본값 1 = 항상 Gemini 시도.
# 0.5로 두면 요청의 절반만 Gemini로 가고 나머지는 FastText 로컬 경로로 빠진다.
GEMINI_TRAFFIC_RATIO=1

# 선택. "fasttext"로 두면 GEMINI_TRAFFIC_RATIO와 무관하게 항상 로컬 경로만 쓴다
# (Gemini API를 아예 호출하지 않음 — 비용을 완전히 0으로 만들고 싶을 때).
EMOTION_ENGINE=gemini
```

> ⚠️ 실제 API 키를 입력하고, `backend/.env` 파일은 GitHub에 업로드하지 마세요. Gemini API 키가 없어도 감정 분석 기능은 정상 동작합니다 — FastText가 분류한 33종 세부 감정과 그 조합으로 만든 원인·심리 통찰 문장이 대신 제공됩니다(자세한 내용은 [Cost Optimization](#cost-optimization) 참고).

기동 후 `POST http://localhost:8000/api/v1/diaries`에 `{"text": "..."}`를 보내면 KcBERT+FastText 추론 → (비용 스위치 통과 시) Gemini 호출 → DB 저장까지 실제로 동작하는 것을 확인할 수 있습니다. 로컬에서 `EMOTION_ENGINE=fasttext`로 띄운 뒤 실제로 검증한 응답 예시:

```json
{
  "id": "92132062-...",
  "content": "오늘 회사에서 프로젝트 일정 때문에 조금 스트레스를 받았다. ...",
  "createdAt": "2026-08-09T07:33:10.857462Z",
  "emotionAnalysis": {
    "label": "중립", "confidence": 0.636, "engine": "fasttext", "...": "..."
  }
}
```

**테스트**

```bash
cd backend
python -m pytest
```

`EmotionAnalysisService`의 엔진 선택 로직(강제 로컬/트래픽 비율/Gemini 실패 폴백)을 KcBERT·FastText·Gemini·랜덤 함수를 모두 가짜 구현으로 주입해 결정론적으로 검증합니다(`backend/tests/test_emotion_analysis_service.py`) — 실제 Gemini API를 호출하지 않아 비용이 들지 않고 재현 가능합니다(docs/PORTFOLIO_REDESIGN.md §26).

**폴더 구조**

```text
backend/
├── app/
│   ├── main.py                    # FastAPI 앱, lifespan에서 KcBERT/FastText 예열
│   ├── core/config.py             # 환경 변수 (Pydantic Settings)
│   ├── api/v1/                    # Router 계층 (diaries, cost)
│   ├── services/
│   │   ├── emotion_analysis.py    # 엔진 선택 오케스트레이션
│   │   ├── cost_tracking.py       # 토큰 → 비용 계산, 인메모리 집계
│   │   └── ai/                    # kcbert.py, fasttext_classifier.py, gemini_client.py
│   ├── repositories/              # SQLAlchemy 쿼리 캡슐화
│   ├── models/                    # User, Diary, EmotionAnalysis (ORM)
│   └── schemas/                   # Pydantic 요청/응답 스키마
├── models/                        # KcBERT(kcbert/), FastText(fasttext/) 모델 바이너리 (Git LFS)
├── training/                      # FastText 학습 스크립트 + 시드 키워드 + 합성 데이터
├── alembic/                       # DB 마이그레이션
└── tests/
```

### 2. 프론트엔드 (Next.js)

```bash
npm install
npm run dev
```

프로젝트 루트에 `.env.local`을 만들어 백엔드 주소를 지정합니다(기본값은 `http://localhost:8000`이라 로컬 개발에서는 생략해도 됩니다).

```env
# 선택. 기본값 http://localhost:8000
BACKEND_URL=http://localhost:8000
```

아래와 같이 로컬 서버 주소가 출력되면, 브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

```text
▲ Next.js 16.2.9 (Turbopack)
- Local: http://localhost:3000
✓ Ready in 1091ms
```

`app/api/analyze/route.ts`와 `app/api/cost/route.ts`는 각각 FastAPI의 `/api/v1/diaries`, `/api/v1/cost/stats`로 요청을 그대로 전달하는 얇은 프록시입니다 — 백엔드가 떠 있지 않으면 일기 분석 요청이 실패합니다.

---

## AI 코딩 에이전트 안내

이 저장소는 [`AGENTS.md`](./AGENTS.md)에 Next.js 버전 관련 주의사항을 명시해두었고, [`CLAUDE.md`](./CLAUDE.md)가 이를 그대로 참조합니다.

* 이 프로젝트가 사용하는 Next.js 버전은 학습 데이터 시점의 Next.js와 API·컨벤션·파일 구조가 다를 수 있습니다(breaking changes).
* Claude Code 등 AI 코딩 에이전트로 코드를 작성하기 전에는 `node_modules/next/dist/docs/`의 관련 가이드를 먼저 확인하고, deprecation 경고를 반드시 따르세요.

---

## 프로젝트 구조

```text
emotional-diary/
├── app/
│   ├── api/
│   │   ├── analyze/
│   │   │   └── route.ts          # 감정 분석 API (KcBERT + FastText + Gemini, 엔진 선택 로직)
│   │   └── cost/
│   │       └── route.ts          # Gemini 누적 비용/토큰 통계 조회 API
│   │
│   ├── components/
│   │   ├── DiaryForm.tsx         # 일기 입력 폼 및 대시보드 레이아웃
│   │   ├── EmotionRingCard.tsx   # 오늘의 감정 원형 진행률 카드
│   │   ├── EmotionSummaryCard.tsx# 감정 요약(퍼센트/신뢰도/강도/키워드) 카드
│   │   ├── EmotionTop3Card.tsx   # 감정 분포 TOP3 카드
│   │   ├── CauseDonutChart.tsx   # 감정 원인 분석 도넛 차트
│   │   ├── WeeklyTrendChart.tsx  # 최근 7일 감정 변화 라인 차트
│   │   ├── DiaryEntry.tsx        # 작성한 일기 원문 카드 (줄노트 배경)
│   │   ├── AiMemo.tsx            # AI 코멘트 카드
│   │   ├── ActivitiesCard.tsx    # AI 추천 활동 카드
│   │   ├── QuoteCard.tsx         # 오늘의 문장 카드
│   │   ├── EmotionDetailSummary.tsx # 감정 분석 상세(심리 상태/주요 원인/성장 포인트/내일의 나에게)
│   │   └── EmotionChart.tsx      # 전체 감정 분포 막대 차트
│   │
│   ├── lib/
│   │   └── emotion-theme.ts      # 33가지 감정 → 색상/아이콘/기분 점수 매핑
│   │
│   ├── globals.css               # Warm Minimal 디자인 토큰 및 유틸리티 클래스
│   ├── layout.tsx
│   └── page.tsx
│
└── backend/                      # FastAPI 백엔드 (위 "FastAPI 백엔드" 섹션의 폴더 구조 참고)
    ├── app/                      # main.py, api/, services/, repositories/, models/, schemas/
    ├── models/                   # KcBERT, FastText 모델 바이너리 (Git LFS)
    ├── training/                 # FastText 학습 스크립트 + 시드 키워드 + 합성 데이터
    ├── alembic/                  # DB 마이그레이션
    └── tests/
```

---

## 컴포넌트 설명

| 컴포넌트 | 설명 |
| -- | -- |
| DiaryForm | 일기 입력 폼과 대시보드 전체 레이아웃 구성 |
| EmotionRingCard | 오늘의 대표 감정을 원형 진행률(Apple Activity Ring 스타일)로 표시 |
| EmotionSummaryCard | 감정 퍼센트, 신뢰도 바, 감정 강도(5점 척도), AI 한 줄 분석, 오늘의 키워드를 한 카드에 정리 |
| EmotionTop3Card | 감정 분포 상위 3개를 바 형태로 표시 |
| CauseDonutChart | 감정 원인과 비중을 도넛 차트로 표시 |
| WeeklyTrendChart | `GET /api/diaries`로 최근 일기를 조회해 최근 7일간 감정 변화를 이모지 포인트 라인 차트로 표시. 그날 작성한 일기가 없으면 값을 지어내지 않고 "기록 없음"(옅은 점, 선 끊김)으로 표시 |
| DiaryEntry | 작성한 일기 원문을 줄노트 배경 위에 손글씨 폰트로 표시 |
| AiMemo | AI 코멘트(2~3문장)를 줄노트 배경 카드로 표시 |
| ActivitiesCard | 오늘의 감정에 맞는 AI 추천 활동 4가지를 아이콘과 함께 표시 |
| QuoteCard | 오늘 하루를 위한 응원 문장을 좋아요 버튼과 함께 표시 |
| EmotionDetailSummary | 심리 상태·주요 원인·성장 포인트·내일의 나에게를 4개 카드로 표시 |
| EmotionChart | 감지된 전체 감정을 강도순으로 시각화하는 막대 차트 |

---

## 감정 분류

KcBERT가 먼저 3가지 극성을 분류하면, Gemini가 이를 참고해 아래 33가지 세부 감정 중 최대 5개를 강도순으로 생성합니다.

| 극성 | 세부 감정 |
| -- | -------- |
| 긍정 | 행복, 사랑, 설렘, 감사, 안도, 자부심, 경외감, 평화로움, 흥분, 만족, 안심, 편안함, 기대, 감동 |
| 부정 | 슬픔, 분노, 불안, 혐오, 죄책감, 수치심, 질투, 외로움, 무기력, 후회 |
| 중립 | 놀람, 지루함, 피곤함, 혼란, 당황, 긴장 |

Gemini API를 쓰지 않는 경우(키 없음, 호출 실패, 또는 `GEMINI_TRAFFIC_RATIO`로 의도적으로 비용을 낮춘 경우)에도 FastText가 33종 세부 감정을 분류해주므로, 극성 3종으로만 뭉뚱그려지지는 않습니다. 다만 FastText 예측에 확신이 가는 라벨이 하나도 없으면(threshold 미만) KcBERT의 긍정·중립·부정 결과로 대체됩니다.

---

## 감정 색상·아이콘 체계

33가지 감정 각각이 고유한 색상과 표정 이모지를 가집니다. 큰 틀에서는 아래 색 계열을 따르되, 같은 계열 안에서도 감정마다 톤이 미세하게 다릅니다.

| 극성 | 색상 범위 | 예시 |
| -- | -------- | ---- |
| 긍정 | 황토 ~ 골드 | 행복 😄, 사랑 🥰, 설렘 🤩, 기대 🤗 |
| 부정 | 슬레이트 ~ 인디고 | 슬픔 😢, 분노 😡, 죄책감 😓, 외로움 🥺 |
| 중립 | 세이지 ~ 그레이 | 놀람 😲, 혼란 😵‍💫, 긴장 😬 |

이 색상·이모지는 감정 진행률 링, 차트, 배지 등 대시보드 전반에서 일관되게 사용되며, `WeeklyTrendChart`는 감정별 기분 점수(effect 기반)로 최근 7일 변화 그래프의 오늘 포인트 위치를 계산합니다.

---

## 디자인 시스템

**Warm Minimal Design System** — Apple HIG, Material 3, Notion, Muji 톤을 참고해 만든 카드 기반 UI 체계입니다.

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
* `.notepad-lines` — 줄노트 배경(가로 룰선). 입력창, 오늘의 기록, AI 코멘트, 오늘의 문장 카드에서 손글씨/코멘트가 실제 공책 위에 쓰인 듯한 느낌을 준다

### 노트 컨셉

실제 종이 노트에 일기를 작성하는 경험을 살리기 위해 다음 요소를 적용했습니다.

* 입력창과 오늘의 기록 카드에 왼쪽 빨간 여백선(입력창) 또는 줄노트 배경(`notepad-lines`) 적용
* 일기 원문은 Gaegu 손글씨 폰트로 표시해, 쓸 때와 결과에서 보여질 때가 자연스럽게 이어지도록 구성
* AI 코멘트·오늘의 문장 카드도 같은 줄노트 배경을 공유해 전체 카드가 하나의 노트북처럼 읽히도록 함

---

## 알려진 제한사항

* 분석 결과는 이제 백엔드 DB(`backend/`의 `diaries`/`emotion_analyses` 테이블)에 저장되지만, 프론트에는 아직 히스토리를 조회하는 화면이 없습니다. `GET /api/v1/diaries`로 조회는 가능하지만 UI가 연결되지 않아, 사용자 입장에서는 새로고침하거나 '다시 쓰기'를 누르면 화면상으로는 사라집니다.
* `WeeklyTrendChart`는 `GET /api/diaries`로 실제 DB 데이터를 조회해 최근 7일을 그립니다(요일 라벨도 실제 날짜 기준). 다만 히스토리 조회 화면 자체는 아직 없어, 이 차트가 유일하게 과거 기록을 보여주는 지점입니다. `EmotionRingCard`의 '어제보다 +N%' 배지는 여전히 고정된 샘플 값입니다.
* 필드 단위 검증(zod 등)은 프론트에 아직 없고, 백엔드의 Pydantic `response_schema` + `GeminiClientError` 조합으로만 방어하고 있습니다.
* 로그인·인증이 없어 `Diary.user_id`가 항상 비어 있습니다(모든 일기가 익명 사용자 소유). 인증은 다음 단계로 설계돼 있습니다(docs/PORTFOLIO_REDESIGN.md §21 Phase 2).
* FastText 분류기는 사람이 라벨링한 실제 일기 데이터가 아니라 키워드 시드로 합성한 문장으로 학습했습니다(weak supervision). 검증셋 precision@1 ≈ 0.95는 같은 방식으로 합성한 데이터에 대한 자체 평가라, 실제 사용자 문장(특히 반어법·은유·복합 감정)에서는 이보다 정확도가 낮을 수 있습니다.
* `/api/v1/cost/stats`의 비용 통계는 서버 프로세스 메모리에만 있는 값이라, 재배포·재시작하면 초기화됩니다. `EmotionAnalysis` 테이블에 요청별 토큰/비용이 이미 쌓이고 있지만, 이를 DB 기준으로 집계하는 대시보드는 아직 없습니다.
* 프론트(Next.js)와 백엔드(FastAPI)를 각각 별도 프로세스로 띄워야 합니다 — 백엔드가 꺼져 있으면 `/api/analyze` 프록시가 실패합니다.

---

## 프로젝트 포인트

* Next.js API Route가 자식 프로세스로 Python을 제어하던 구조를, FastAPI 백엔드로 통합해 Controller(Router)/Service/Repository 3계층으로 재설계 — 프로세스 IPC 계층 자체를 없앤 것이 핵심 변경
* 로컬 AI 모델(KcBERT + FastText)을 FastAPI `lifespan`에서 한 번만 로딩해 in-process로 서빙
* Gemini Structured Output(Pydantic `response_schema`)을 활용한 안정적인 응답 파싱
* Gemini 장애 시 FastText 기반 자동 Fallback으로 서비스 연속성 확보 (극성 3종이 아닌 33종 세부 감정 수준까지)
* 실제 `usage_metadata` 기반 Gemini 비용 실시간 계산·집계(`/api/v1/cost/stats`), `thinking_budget` 튜닝으로 요청당 비용 6.3배 절감 실측
* `GEMINI_TRAFFIC_RATIO` 환경 변수로 Gemini ↔ FastText 트래픽을 조절해 비용을 원하는 지점까지(극단적으로는 $0까지) 낮추는 비용 스위치 구현
* 라벨링 데이터 없이 키워드 시드 + weak supervision으로 FastText 다중 라벨 분류기 부트스트랩 (모델 크기 1/171, CPU 전용)
* SQLAlchemy 2.0(async) + Alembic으로 일기·분석 결과(토큰/비용/응답시간 포함)를 DB에 영속화
* `EmotionAnalysisService`의 엔진 라우팅 로직을 Gemini·DB·랜덤 함수 없이 mock으로 결정론적 단위 테스트
* Ring · Donut · Line · 막대 차트를 조합한 감정 데이터 시각화 UI 구현

---

## 향후 계획

- [x] ~~히스토리 저장 기능 (데이터베이스 연동)~~ — 백엔드에 구현 완료, 프론트 조회 화면은 아직
- [ ] 히스토리 조회 화면 (캘린더 뷰 포함) — `GET /api/v1/diaries`를 소비하는 프론트 UI
- [ ] 사용자 로그인 및 계정별 기록 관리 (JWT 인증, docs/PORTFOLIO_REDESIGN.md §21 Phase 2)
- [ ] 감정 통계 · 월간 리포트
- [ ] 모델 성능 개선
- [ ] FastText 분류기를 합성 데이터 대신 실제 사용자 일기(익명화) + 사람 검수 라벨로 재학습
- [ ] `/api/v1/cost/stats`를 DB 집계 기반으로 바꿔 재배포 후에도 유지
- [ ] 배포 환경 구성 (Frontend: Vercel / Backend: Docker)

---

## 기대 효과

* 감정을 스스로 분류하거나 언어화해야 하는 부담 없이, 사용자는 글만 작성하면 감정 인사이트를 얻을 수 있다
* 원인·심리 상태·성장 포인트까지 함께 제시되어, 단순 기록을 넘어 자기 이해를 돕는 도구로 기능한다
* 로컬 분류 모델(KcBERT, FastText)과 생성형 AI(Gemini)를 결합한 파이프라인과 비용 스위치(`GEMINI_TRAFFIC_RATIO`)를 통해, 외부 API 장애 상황에서도 서비스 연속성을 확보하고 트래픽이 늘어도 비용을 통제 가능한 범위로 유지하는 구조를 검증할 수 있다

---

## 라이선스

본 프로젝트는 개인 학습과 포트폴리오를 목적으로 제작되었습니다.
상업적 이용을 목적으로 하지 않습니다.
