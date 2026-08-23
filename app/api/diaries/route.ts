// 최근 7일 감정 변화(WeeklyTrendChart)를 실제 데이터로 그리기 위한 얇은 프록시.
// FastAPI의 GET /api/v1/diaries를 그대로 전달한다 — 다른 프록시 라우트와 동일한 패턴.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ?? '30'

    const backendRes = await fetch(`${BACKEND_URL}/api/v1/diaries?limit=${encodeURIComponent(limit)}`, {
      cache: 'no-store',
      headers: request.headers.get('authorization')
        ? { Authorization: request.headers.get('authorization')! }
        : {},
    })
    const data = await backendRes.json()
    return Response.json(data, { status: backendRes.status })
  } catch (error) {
    console.error('Diaries API (FastAPI 프록시) 호출 실패:', error)
    return Response.json({ error: '최근 기록을 불러오지 못했습니다.' }, { status: 500 })
  }
}
