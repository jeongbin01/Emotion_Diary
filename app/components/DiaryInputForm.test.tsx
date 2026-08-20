// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DiaryInputForm from './DiaryInputForm'

function setup(overrides: Partial<React.ComponentProps<typeof DiaryInputForm>> = {}) {
  const onChange = vi.fn()
  const onSubmit = vi.fn()
  const props = {
    value: '',
    onChange,
    onSubmit,
    loading: false,
    tooShort: true,
    ...overrides,
  }
  render(<DiaryInputForm {...props} />)
  return { onChange, onSubmit }
}

describe('DiaryInputForm', () => {
  it('disables the submit button and hides the hint when the field is empty', () => {
    setup({ value: '', tooShort: true })
    expect(screen.getByRole('button', { name: /오늘의 감정 기록하기/ })).toBeDisabled()
    expect(screen.queryByText('10자 이상 적어주세요')).not.toBeInTheDocument()
  })

  it('shows the length hint and keeps the button disabled once the user starts typing but stays under 10 chars', () => {
    setup({ value: '짧은글', tooShort: true })
    expect(screen.getByText('10자 이상 적어주세요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /오늘의 감정 기록하기/ })).toBeDisabled()
  })

  it('enables the submit button once the text reaches 10 characters', () => {
    setup({ value: '오늘 하루는 정말 길었다', tooShort: false })
    expect(screen.getByRole('button', { name: /오늘의 감정 기록하기/ })).toBeEnabled()
  })

  it('calls onChange with the typed text as the user types', async () => {
    const { onChange } = setup({ value: '' })
    await userEvent.type(screen.getByLabelText('오늘 하루 어땠나요?'), 'a')
    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('calls onSubmit when the button is clicked while enabled', async () => {
    const { onSubmit } = setup({ value: '오늘 하루는 정말 길었다', tooShort: false })
    await userEvent.click(screen.getByRole('button', { name: /오늘의 감정 기록하기/ }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('shows a loading state and marks the button busy while analyzing', () => {
    setup({ value: '오늘 하루는 정말 길었다', tooShort: false, loading: true })
    const button = screen.getByRole('button', { name: /감정을 분석하는 중/ })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})
