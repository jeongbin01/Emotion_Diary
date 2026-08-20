// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DiaryForm from './DiaryForm'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

const analysisResult = {
  label: '행복',
  confidence: 0.9,
  aiOneLiner: '오늘 하루, 행복 감정이 마음을 가장 크게 채웠어요.',
  aiMessage: '오늘 하루도 고생 많으셨어요.',
  emotions: [{ label: '행복', score: 0.8 }],
  causes: [{ label: '행복을(를) 느낀 순간', percent: 100 }],
  keywords: ['행복'],
  mindState: '오늘은 행복 감정이 두드러진 하루였어요.',
  growthPoint: '감정을 있는 그대로 기록해본 것 자체가 오늘의 성장 포인트예요.',
  tomorrowMessage: '오늘보다 조금 더 편안한 하루가 되기를 바라요.',
  activities: [{ icon: '🎵', label: '좋아하는 음악' }],
  quote: '충분히 쉬는 것도 하루를 잘 보내는 방법입니다.',
}

describe('DiaryForm integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lets a user write a diary, see the loading state, view the result dashboard, and return via 다시 쓰기', async () => {
    let resolveAnalyze: (res: Response) => void
    const analyzePromise = new Promise<Response>((resolve) => {
      resolveAnalyze = resolve
    })
    vi.mocked(fetch).mockImplementation((url) =>
      String(url).startsWith('/api/analyze') ? analyzePromise : Promise.resolve(jsonResponse([])),
    )

    render(<DiaryForm />)

    await userEvent.type(
      screen.getByLabelText('오늘 하루 어땠나요?'),
      '오늘 회사에서 좋은 일이 있어서 기분이 좋았다',
    )
    await userEvent.click(screen.getByRole('button', { name: /오늘의 감정 기록하기/ }))

    expect(await screen.findByText('감정을 분석하는 중...')).toBeInTheDocument()

    resolveAnalyze!(jsonResponse(analysisResult))

    expect(await screen.findByText(analysisResult.aiOneLiner)).toBeInTheDocument()
    expect(screen.queryByLabelText('오늘 하루 어땠나요?')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '다시 쓰기' }))

    expect(await screen.findByLabelText('오늘 하루 어땠나요?')).toBeInTheDocument()
    expect(screen.queryByText(analysisResult.aiOneLiner)).not.toBeInTheDocument()
  })

  it('shows a rate-limit message and lets the user retry without losing the results view state', async () => {
    vi.mocked(fetch).mockImplementation((url) =>
      Promise.resolve(
        String(url).startsWith('/api/analyze') ? jsonResponse({ error: 'Rate limit exceeded' }, 429) : jsonResponse([]),
      ),
    )

    render(<DiaryForm />)

    await userEvent.type(
      screen.getByLabelText('오늘 하루 어땠나요?'),
      '오늘 회사에서 좋은 일이 있어서 기분이 좋았다',
    )
    await userEvent.click(screen.getByRole('button', { name: /오늘의 감정 기록하기/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.')
    // 실패했으니 결과 대시보드가 아니라 다시 입력 폼이 보여야 한다.
    expect(screen.getByLabelText('오늘 하루 어땠나요?')).toBeInTheDocument()
  })
})
