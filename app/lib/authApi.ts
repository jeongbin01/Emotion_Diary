export type AuthUser = {
  id: string
  email: string
  createdAt: string
}

export class EmailTakenError extends Error {}
export class InvalidCredentialsError extends Error {}
export class ValidationError extends Error {}
export class ServerError extends Error {}
export class NetworkError extends Error {}

function errorForStatus(status: number, message: string): Error {
  if (status === 409) return new EmailTakenError(message)
  if (status === 401) return new InvalidCredentialsError(message)
  if (status === 422) return new ValidationError(message)
  return new ServerError(message)
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new NetworkError('요청에 실패했습니다. 네트워크 상태를 확인해 주세요.')
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw errorForStatus(response.status, data?.error ?? '요청 처리 중 오류가 발생했습니다.')
  }
  return data as T
}

export function signup(email: string, password: string): Promise<AuthUser> {
  return postJson<AuthUser>('/api/auth/signup', { email, password })
}

export async function login(email: string, password: string): Promise<string> {
  const data = await postJson<{ accessToken: string }>('/api/auth/login', { email, password })
  return data.accessToken
}
