// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ErrorBanner from './ErrorBanner'

describe('ErrorBanner', () => {
  it('exposes the message as an alert so assistive tech announces it', () => {
    render(<ErrorBanner message="요청이 너무 많습니다." />)
    expect(screen.getByRole('alert')).toHaveTextContent('요청이 너무 많습니다.')
  })
})
