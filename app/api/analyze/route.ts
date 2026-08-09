// 이 라우트는 더 이상 AI 오케스트레이션 로직을 직접 갖지 않는다. KcBERT/FastText/Gemini
// 하이브리드 파이프라인은 backend/app/services/emotion_analysis.py로 완전히 이관됐고,
// 여기서는 프론트(DiaryForm.tsx)의 fetch('/api/analyze') 호출 경로를 바꾸지 않기 위한 얇은
// 프록시만 남겼다 — GEMINI_API_KEY는 Next.js 쪽에 더 이상 존재하지 않고 backend/.env에만 있다.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text?.trim()) {
      return Response.json({ error: '텍스트를 입력해주세요.' }, { status: 400 })
    }

    const backendRes = await fetch(`${BACKEND_URL}/api/v1/diaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!backendRes.ok) {
      const errorBody = await backendRes.json().catch(() => null)
      return Response.json(
        { error: errorBody?.detail ?? '감정 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
        { status: backendRes.status },
      )
    }

    // FastAPI는 { id, content, createdAt, emotionAnalysis } 형태로 응답한다. emotionAnalysis가
    // 기존 Next.js 버전이 반환하던 AnalyzeResult(label/confidence/emotions/.../engine)와
    // camelCase 필드까지 동일해서, 그대로 꺼내 돌려주면 DiaryForm.tsx는 수정할 필요가 없다.
    const diary = await backendRes.json()
    return Response.json(diary.emotionAnalysis)
  } catch (error) {
    console.error('Analyze API (FastAPI 프록시) 호출 실패:', error)
    return Response.json(
      { error: '감정 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 },
    )
  }
}
