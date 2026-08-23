import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EmailTakenError, InvalidCredentialsError, ValidationError, login, signup } from './authApi'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

describe('signup', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the created user on success', async () => {
    const user = { id: '1', email: 'user@example.com', createdAt: '2026-08-23T00:00:00Z' }
    vi.mocked(fetch).mockResolvedValue(jsonResponse(user))

    await expect(signup('user@example.com', 'password123')).resolves.toEqual(user)
  })

  it('throws EmailTakenError on a 409 response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: '이미 가입된 이메일입니다.' }, 409))

    await expect(signup('user@example.com', 'password123')).rejects.toBeInstanceOf(EmailTakenError)
  })

  it('throws ValidationError on a 422 response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: '입력값을 다시 확인해주세요.' }, 422))

    await expect(signup('not-an-email', 'short')).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('login', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the access token on success', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ accessToken: 'a-jwt-token', tokenType: 'bearer' }))

    await expect(login('user@example.com', 'password123')).resolves.toBe('a-jwt-token')
  })

  it('throws InvalidCredentialsError on a 401 response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401),
    )

    await expect(login('user@example.com', 'wrong-password')).rejects.toBeInstanceOf(InvalidCredentialsError)
  })
})
