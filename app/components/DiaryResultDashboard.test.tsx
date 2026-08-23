// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DiaryResultDashboard from './DiaryResultDashboard'
import type { DiaryAnalysisResult } from '../lib/diaryApi'

const baseResult: DiaryAnalysisResult = {
  label: '행복',
  confidence: 0.9,
  aiOneLiner: '오늘 하루, 행복 감정이 마음을 가장 크게 채웠어요.',
  aiMessage: '',
  emotions: [],
  causes: [],
  keywords: [],
  mindState: '오늘은 행복 감정이 두드러진 하루였어요.',
  growthPoint: '감정을 있는 그대로 기록해본 것 자체가 오늘의 성장 포인트예요.',
  tomorrowMessage: '오늘보다 조금 더 편안한 하루가 되기를 바라요.',
  activities: [],
  quote: '',
}

describe('DiaryResultDashboard', () => {
  it('hides emotion/cause/activity/message cards when the analysis has no data for them', () => {
    render(<DiaryResultDashboard result={baseResult} text="오늘 하루" pastDays={undefined} onReset={vi.fn()} />)

    expect(screen.queryByText('감정 분포 TOP 3')).not.toBeInTheDocument()
    expect(screen.queryByText('감정 원인 분석')).not.toBeInTheDocument()
    expect(screen.queryByText('AI 추천 활동')).not.toBeInTheDocument()
    expect(screen.queryByText('AI 의 한마디')).not.toBeInTheDocument()
    expect(screen.queryByText('오늘의 문장')).not.toBeInTheDocument()
    expect(screen.queryByText('전체 감정 분포')).not.toBeInTheDocument()

    // 데이터가 없어도 항상 보여야 하는 영역은 그대로 렌더링된다.
    expect(screen.getByText('오늘의 감정 요약')).toBeInTheDocument()
    expect(screen.getByText('최근 7일 감정 변화')).toBeInTheDocument()
    expect(screen.getByText('오늘의 기록')).toBeInTheDocument()
  })

  it('shows every optional card once the analysis provides data for it', () => {
    const fullResult: DiaryAnalysisResult = {
      ...baseResult,
      aiMessage: '오늘 하루도 고생 많으셨어요.',
      emotions: [{ label: '행복', score: 0.8 }],
      causes: [{ label: '행복을(를) 느낀 순간', percent: 100 }],
      activities: [{ icon: '🎵', label: '좋아하는 음악' }],
      quote: '충분히 쉬는 것도 하루를 잘 보내는 방법입니다.',
    }

    render(<DiaryResultDashboard result={fullResult} text="오늘 하루" pastDays={undefined} onReset={vi.fn()} />)

    expect(screen.getByText('감정 분포 TOP 3')).toBeInTheDocument()
    expect(screen.getByText('감정 원인 분석')).toBeInTheDocument()
    expect(screen.getByText('AI 추천 활동')).toBeInTheDocument()
    expect(screen.getByText('AI 의 한마디')).toBeInTheDocument()
    expect(screen.getByText('오늘의 문장')).toBeInTheDocument()
    expect(screen.getByText('전체 감정 분포')).toBeInTheDocument()
  })

  it('lets the user start over via the 다시 쓰기 button', async () => {
    const onReset = vi.fn()
    render(<DiaryResultDashboard result={baseResult} text="오늘 하루" pastDays={undefined} onReset={onReset} />)

    await userEvent.click(screen.getByRole('button', { name: '다시 쓰기' }))

    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
