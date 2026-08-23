// backend/app/api/v1/auth.py로 향하는 얇은 프록시. 다른 /api 라우트와 동일한 이유로
// 존재한다 — 프론트는 항상 같은 오리진(/api/...)만 호출하면 되고, 백엔드 주소나 인증 로직이
// 바뀌어도 클라이언트 코드는 그대로 둘 수 있다.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

type BackendErrorBody = {
  detail?: string | { msg?: string }[]
  error?: string
}

function extractErrorMessage(data: BackendErrorBody | null, fallback: string): string {
  if (!data) return fallback
  // HTTPException(409 이메일 중복 등)은 detail이 문자열이지만, Pydantic 검증 실패(422, 예:
  // 비밀번호 8자 미만/잘못된 이메일 형식)는 detail이 { msg, loc, type } 배열로 온다.
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail) && data.detail.length > 0 && typeof data.detail[0]?.msg === 'string') {
    return data.detail[0].msg
  }
  if (typeof data.error === 'string') return data.error
  return fallback
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const backendRes = await fetch(`${BACKEND_URL}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await backendRes.json().catch(() => null)

    if (!backendRes.ok) {
      return Response.json(
        { error: extractErrorMessage(data, '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.') },
        { status: backendRes.status },
      )
    }

    return Response.json(data)
  } catch (error) {
    console.error('Signup API (FastAPI 프록시) 호출 실패:', error)
    return Response.json(
      { error: '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 },
    )
  }
}
