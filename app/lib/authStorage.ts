// localStorage에 토큰을 두면 XSS에 노출될 수 있다는 점을 인지하고 있다. httpOnly 쿠키가 더
// 안전하지만, diaries API가 아직 인증을 요구하지 않아(백엔드 연동은 별도 작업) 지금은 로그인
// 자체를 검증하는 최소 구현으로 시작하고, 실제 일기 API에 인증을 연결할 때 쿠키 기반으로
// 전환하는 것을 권장한다.
const TOKEN_KEY = 'emotion_diary_access_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
}
