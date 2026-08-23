// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AuthForm from './AuthForm'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

describe('AuthForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  it('logs the user in and clears the error banner on success', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ accessToken: 'a-jwt-token', tokenType: 'bearer' }))

    render(<AuthForm />)
    await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('button', { name: '로그인' })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(window.localStorage.getItem('emotion_diary_access_token')).toBe('a-jwt-token')
  })

  it('shows an error banner when login fails', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401),
    )

    render(<AuthForm />)
    await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('이메일 또는 비밀번호가 올바르지 않습니다.')
  })

  it('switches to signup mode, submits, and returns to login mode with a success message', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ id: '1', email: 'user@example.com', createdAt: '2026-08-23T00:00:00Z' }, 201),
    )

    render(<AuthForm />)
    await userEvent.click(screen.getByRole('button', { name: '계정이 없으신가요? 회원가입' }))
    expect(screen.getByRole('heading', { name: '회원가입' })).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByText('회원가입이 완료됐습니다. 로그인해주세요.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
  })

  it('shows a loading state while the request is in flight', async () => {
    let resolveLogin: (res: Response) => void
    const loginPromise = new Promise<Response>((resolve) => {
      resolveLogin = resolve
    })
    vi.mocked(fetch).mockReturnValue(loginPromise)

    render(<AuthForm />)
    await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: '로그인' }))

    const button = await screen.findByRole('button', { name: '처리 중...' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')

    resolveLogin!(jsonResponse({ accessToken: 'a-jwt-token', tokenType: 'bearer' }))
    expect(await screen.findByRole('button', { name: '로그인' })).toBeEnabled()
  })
})
