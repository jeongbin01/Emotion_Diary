import { describe, expect, it } from 'vitest'
import { DETAILED_EMOTION_LABELS, EMOTION_THEME, getEmotionTheme } from './emotion-theme'

describe('getEmotionTheme', () => {
  it('returns the matching theme for a known label', () => {
    const theme = getEmotionTheme('행복')
    expect(theme).toEqual(EMOTION_THEME['행복'])
    expect(theme.display).toBe('행복')
  })

  it('falls back to the default theme with the raw label as display for unknown labels', () => {
    const theme = getEmotionTheme('알수없는감정')
    expect(theme.display).toBe('알수없는감정')
    expect(theme.icon).toBe('🍃')
    expect(theme.color).toBe('#7C8B6F')
    expect(theme.effect).toBe('forest')
  })
})

describe('DETAILED_EMOTION_LABELS', () => {
  it('excludes the three base polarity labels', () => {
    expect(DETAILED_EMOTION_LABELS).not.toContain('긍정')
    expect(DETAILED_EMOTION_LABELS).not.toContain('중립')
    expect(DETAILED_EMOTION_LABELS).not.toContain('부정')
  })

  it('contains every other label defined in EMOTION_THEME', () => {
    expect(DETAILED_EMOTION_LABELS.length).toBe(Object.keys(EMOTION_THEME).length - 3)
  })
})
