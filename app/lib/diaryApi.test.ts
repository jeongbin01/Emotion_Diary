import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AnalysisTimeoutError,
  NetworkError,
  RateLimitedError,
  ServerError,
  fetchPastDays,
  postAnalyze,
} from './diaryApi'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

describe('postAnalyze', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the parsed analysis result on success', async () => {
    const result = { label: '행복', confidence: 0.9 }
    vi.mocked(fetch).mockResolvedValue(jsonResponse(result))

    await expect(postAnalyze('오늘 하루')).resolves.toEqual(result)
  })

  it('throws RateLimitedError on a 429 response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'Rate limit exceeded' }, 429))

    await expect(postAnalyze('텍스트')).rejects.toBeInstanceOf(RateLimitedError)
  })

  it('throws AnalysisTimeoutError on a 504 response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'Gateway Timeout' }, 504))

    await expect(postAnalyze('텍스트')).rejects.toBeInstanceOf(AnalysisTimeoutError)
  })

  it('throws ServerError on other non-ok responses', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: '서버 오류' }, 500))

    await expect(postAnalyze('텍스트')).rejects.toBeInstanceOf(ServerError)
  })

  it('throws AnalysisTimeoutError when the client-side request timeout aborts the fetch', async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException('The operation was aborted.', 'TimeoutError'))

    await expect(postAnalyze('텍스트')).rejects.toBeInstanceOf(AnalysisTimeoutError)
  })

  it('throws NetworkError for other fetch failures', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(postAnalyze('텍스트')).rejects.toBeInstanceOf(NetworkError)
  })
})

describe('fetchPastDays', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the diary summary list on success', async () => {
    const days = [{ createdAt: '2026-08-20T00:00:00Z', emotionAnalysis: { label: '행복' } }]
    vi.mocked(fetch).mockResolvedValue(jsonResponse(days))

    await expect(fetchPastDays(6)).resolves.toEqual(days)
  })

  it('throws when the response body is not an array', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'oops' }))

    await expect(fetchPastDays(6)).rejects.toThrow('예상하지 못한 응답 형식입니다.')
  })
})
