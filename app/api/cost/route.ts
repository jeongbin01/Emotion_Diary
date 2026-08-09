// 비용 집계 로직도 backend/app/services/cost_tracking.py로 이관됐다. 이 라우트는 프론트가
// 기존 경로(/api/cost)를 그대로 쓸 수 있도록 FastAPI의 /api/v1/cost/stats를 그대로 전달한다.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

export async function GET() {
  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/v1/cost/stats`, { cache: 'no-store' })
    const data = await backendRes.json()
    return Response.json(data, { status: backendRes.status })
  } catch (error) {
    console.error('Cost API (FastAPI 프록시) 호출 실패:', error)
    return Response.json({ error: '비용 통계를 불러오지 못했습니다.' }, { status: 500 })
  }
}
