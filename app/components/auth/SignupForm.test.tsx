// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SignupForm from './SignupForm'

function jsonResponse(body: unknown, status = 201) {
  return new Response(JSON.stringify(body), { status })
}

describe('SignupForm', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => vi.unstubAllGlobals())

  it('submits valid input and provides a login link', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: '1', email: 'user@example.com', createdAt: '2026-08-23T00:00:00Z' }))
    render(<SignupForm />)

    await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
    await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'password123')
    await userEvent.click(screen.getByLabelText('이용약관 및 개인정보 처리방침에 동의합니다.'))
    await userEvent.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByRole('status')).toHaveTextContent('회원가입이 완료되었습니다.')
    expect(screen.getByRole('link', { name: '로그인하기' })).toHaveAttribute('href', '/login')
  })
})
