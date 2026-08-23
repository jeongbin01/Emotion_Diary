const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

type BackendErrorBody = {
  detail?: string | { msg?: string }[]
  error?: string
}

function extractErrorMessage(data: BackendErrorBody | null, fallback: string): string {
  if (!data) return fallback
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

    const backendRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await backendRes.json().catch(() => null)

    if (!backendRes.ok) {
      return Response.json(
        { error: extractErrorMessage(data, '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.') },
        { status: backendRes.status },
      )
    }

    return Response.json(data)
  } catch (error) {
    console.error('Login API (FastAPI 프록시) 호출 실패:', error)
    return Response.json(
      { error: '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 },
    )
  }
}
