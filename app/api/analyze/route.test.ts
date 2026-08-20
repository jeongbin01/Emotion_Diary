import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

function req(body: unknown) {
  return new Request('http://localhost/api/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns 400 for empty/whitespace text without calling the backend', async () => {
    const res = await POST(req({ text: '   ' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: '텍스트를 입력해주세요.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('forwards the backend error status and detail message', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: '분석 실패' }), { status: 502 }),
    )

    const res = await POST(req({ text: '오늘 하루 기록' }))

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: '분석 실패' })
  })

  it('falls back to a generic message when the backend error body has no detail', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('not json', { status: 500 }))

    const res = await POST(req({ text: '오늘 하루 기록' }))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: '감정 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' })
  })

  it('unwraps emotionAnalysis from a successful backend response', async () => {
    const emotionAnalysis = { label: '행복', confidence: 0.9 }
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: '1', content: '..', emotionAnalysis }), { status: 201 }),
    )

    const res = await POST(req({ text: '오늘 하루 기록' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(emotionAnalysis)
  })

  it('returns 500 when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))

    const res = await POST(req({ text: '오늘 하루 기록' }))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: '감정 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' })
  })
})
