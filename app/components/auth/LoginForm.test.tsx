// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LoginForm from './LoginForm'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  it('accepts input and stores the token after a successful login', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ accessToken: 'a-jwt-token', tokenType: 'bearer' }))
    render(<LoginForm />)

    await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('button', { name: '로그인' })).toBeEnabled()
    expect(window.localStorage.getItem('emotion_diary_access_token')).toBe('a-jwt-token')
  })
})
