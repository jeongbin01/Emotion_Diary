import { describe, expect, it } from 'vitest'
import { WEEKDAY_LABELS, buildPastDays, todayLabel, type DiarySummary } from './weeklyTrend'

const NOW = new Date(2026, 7, 20) // 2026-08-20, 고정 기준 시각

function daysAgo(offset: number, hour = 12): Date {
  const d = new Date(NOW)
  d.setDate(d.getDate() - offset)
  d.setHours(hour, 0, 0, 0)
  return d
}

describe('todayLabel', () => {
  it("returns the weekday label matching now's getDay()", () => {
    expect(todayLabel(NOW)).toBe(WEEKDAY_LABELS[NOW.getDay()])
  })
})

describe('buildPastDays', () => {
  it('returns 6 entries with null emotionLabel when there are no diaries', () => {
    const days = buildPastDays([], NOW)
    expect(days).toHaveLength(6)
    expect(days.every((d) => d.emotionLabel === null)).toBe(true)
    expect(days[5].dayLabel).toBe(WEEKDAY_LABELS[daysAgo(1).getDay()])
    expect(days[0].dayLabel).toBe(WEEKDAY_LABELS[daysAgo(6).getDay()])
  })

  it('fills in the emotion label for a day that has a diary', () => {
    const diaries: DiarySummary[] = [
      { createdAt: daysAgo(2).toISOString(), emotionAnalysis: { label: '행복' } },
    ]
    const days = buildPastDays(diaries, NOW)
    expect(days[4].emotionLabel).toBe('행복')
  })

  it('keeps the first (most recent) label when multiple diaries share a day', () => {
    const diaries: DiarySummary[] = [
      { createdAt: daysAgo(3, 20).toISOString(), emotionAnalysis: { label: '슬픔' } },
      { createdAt: daysAgo(3, 8).toISOString(), emotionAnalysis: { label: '분노' } },
    ]
    const days = buildPastDays(diaries, NOW)
    expect(days[3].emotionLabel).toBe('슬픔')
  })

  it('ignores diaries with an unparseable createdAt', () => {
    const diaries: DiarySummary[] = [{ createdAt: 'not-a-date', emotionAnalysis: { label: '행복' } }]
    const days = buildPastDays(diaries, NOW)
    expect(days.every((d) => d.emotionLabel === null)).toBe(true)
  })

  it('treats a diary with no emotionAnalysis/label as having no label for that day', () => {
    const diaries: DiarySummary[] = [{ createdAt: daysAgo(1).toISOString() }]
    const days = buildPastDays(diaries, NOW)
    expect(days[5].emotionLabel).toBeNull()
  })

  it('does not surface diaries outside the 6-day window', () => {
    const diaries: DiarySummary[] = [
      { createdAt: daysAgo(10).toISOString(), emotionAnalysis: { label: '행복' } },
    ]
    const days = buildPastDays(diaries, NOW)
    expect(days.every((d) => d.emotionLabel === null)).toBe(true)
  })
})
