// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDiaryAnalysis } from './useDiaryAnalysis'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

const analysisResult = {
  label: '행복',
  confidence: 0.9,
  aiOneLiner: '오늘은 행복한 하루였어요.',
  aiMessage: '오늘 하루도 고생 많으셨어요.',
  emotions: [],
  causes: [],
  keywords: [],
  mindState: '',
  growthPoint: '',
  tomorrowMessage: '',
  activities: [],
  quote: '',
}

const LONG_ENOUGH_TEXT = '오늘 하루는 정말 길었다'

describe('useDiaryAnalysis', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets the result and clears loading/error on a successful analyze', async () => {
    vi.mocked(fetch).mockImplementation((url) =>
      Promise.resolve(String(url).startsWith('/api/analyze') ? jsonResponse(analysisResult) : jsonResponse([])),
    )

    const { result } = renderHook(() => useDiaryAnalysis())
    act(() => result.current.setText(LONG_ENOUGH_TEXT))
    await act(async () => {
      await result.current.analyze()
    })

    expect(result.current.result).toEqual(analysisResult)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('')
  })

  it('shows a rate-limit-specific message on a 429 response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'Rate limit exceeded' }, 429))

    const { result } = renderHook(() => useDiaryAnalysis())
    act(() => result.current.setText(LONG_ENOUGH_TEXT))
    await act(async () => {
      await result.current.analyze()
    })

    expect(result.current.error).toBe('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.')
    expect(result.current.result).toBeNull()
  })

  it('shows a timeout-specific message on a 504 response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: '분석이 너무 오래 걸려 중단했습니다.' }, 504))

    const { result } = renderHook(() => useDiaryAnalysis())
    act(() => result.current.setText(LONG_ENOUGH_TEXT))
    await act(async () => {
      await result.current.analyze()
    })

    expect(result.current.error).toBe('분석이 오래 걸려 중단됐습니다. 잠시 후 다시 시도해주세요.')
  })

  it('shows a network error message when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useDiaryAnalysis())
    act(() => result.current.setText(LONG_ENOUGH_TEXT))
    await act(async () => {
      await result.current.analyze()
    })

    expect(result.current.error).toBe('감정 분석 요청에 실패했습니다. 네트워크 상태를 확인해주세요.')
  })

  it('does nothing when the text is under the minimum length', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(analysisResult))

    const { result } = renderHook(() => useDiaryAnalysis())
    act(() => result.current.setText('짧음'))
    await act(async () => {
      await result.current.analyze()
    })

    expect(fetch).not.toHaveBeenCalled()
    expect(result.current.result).toBeNull()
  })

  it('resets all state back to initial values', async () => {
    vi.mocked(fetch).mockImplementation((url) =>
      Promise.resolve(String(url).startsWith('/api/analyze') ? jsonResponse(analysisResult) : jsonResponse([])),
    )

    const { result } = renderHook(() => useDiaryAnalysis())
    act(() => result.current.setText(LONG_ENOUGH_TEXT))
    await act(async () => {
      await result.current.analyze()
    })
    expect(result.current.result).not.toBeNull()

    act(() => result.current.reset())

    expect(result.current.text).toBe('')
    expect(result.current.result).toBeNull()
    expect(result.current.error).toBe('')
    expect(result.current.pastDays).toBeUndefined()
  })

  it('silently ignores a failed pastDays fetch instead of surfacing an error', async () => {
    vi.mocked(fetch).mockImplementation((url) =>
      String(url).startsWith('/api/analyze')
        ? Promise.resolve(jsonResponse(analysisResult))
        : Promise.reject(new Error('pastDays fetch failed')),
    )

    const { result } = renderHook(() => useDiaryAnalysis())
    act(() => result.current.setText(LONG_ENOUGH_TEXT))
    await act(async () => {
      await result.current.analyze()
    })

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/diaries'), expect.anything()),
    )

    // 대시보드 보조 데이터일 뿐이라, 실패해도 사용자에게는 에러가 노출되지 않아야 한다.
    expect(result.current.error).toBe('')
    expect(result.current.pastDays).toBeUndefined()
  })
})
