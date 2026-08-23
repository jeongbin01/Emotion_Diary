// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

function Bomb(): never {
  throw new Error('렌더링 중 발생한 예외')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React가 잡힌 에러를 콘솔에 그대로 남겨 테스트 출력이 지저분해지는 것을 막는다.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a fallback message instead of crashing when a child throws', () => {
    render(
      <ErrorBoundary onReset={vi.fn()}>
        <Bomb />
      </ErrorBoundary>,
    )

    expect(screen.getByText('결과를 표시하는 중 문제가 발생했습니다.')).toBeInTheDocument()
  })

  it('calls onReset when the user clicks 다시 쓰기 on the fallback', async () => {
    const onReset = vi.fn()
    render(
      <ErrorBoundary onReset={onReset}>
        <Bomb />
      </ErrorBoundary>,
    )

    await userEvent.click(screen.getByRole('button', { name: '다시 쓰기' }))

    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('renders children normally when nothing throws', () => {
    render(
      <ErrorBoundary onReset={vi.fn()}>
        <p>정상 렌더링된 내용</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('정상 렌더링된 내용')).toBeInTheDocument()
    expect(screen.queryByText('결과를 표시하는 중 문제가 발생했습니다.')).not.toBeInTheDocument()
  })
})
