// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './useAuth'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  it('starts unauthenticated when there is no stored token', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('logs in successfully, stores the token, and marks the user authenticated', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ accessToken: 'a-jwt-token', tokenType: 'bearer' }))

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.login('user@example.com', 'password123')
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.error).toBe('')
    expect(window.localStorage.getItem('emotion_diary_access_token')).toBe('a-jwt-token')
  })

  it('shows an error message and stays unauthenticated on invalid login credentials', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401),
    )

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.login('user@example.com', 'wrong-password')
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.error).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
  })

  it('signs up successfully without authenticating the user', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ id: '1', email: 'user@example.com', createdAt: '2026-08-23T00:00:00Z' }, 201),
    )

    const { result } = renderHook(() => useAuth())
    let ok = false
    await act(async () => {
      ok = await result.current.signup('user@example.com', 'password123')
    })

    expect(ok).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('shows an error message when signup fails with a duplicate email', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: '이미 가입된 이메일입니다.' }, 409))

    const { result } = renderHook(() => useAuth())
    let ok = true
    await act(async () => {
      ok = await result.current.signup('user@example.com', 'password123')
    })

    expect(ok).toBe(false)
    expect(result.current.error).toBe('이미 가입된 이메일입니다.')
  })

  it('logs out by clearing the stored token', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ accessToken: 'a-jwt-token', tokenType: 'bearer' }))
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.login('user@example.com', 'password123')
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(window.localStorage.getItem('emotion_diary_access_token')).toBeNull()
  })
})
