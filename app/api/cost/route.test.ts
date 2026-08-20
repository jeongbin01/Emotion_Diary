import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

describe('GET /api/cost', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('passes through the backend status and body', async () => {
    const stats = { requestCount: 3, totalCostUSD: 0.01 }
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(stats), { status: 200 }))

    const res = await GET()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(stats)
  })

  it('returns 500 when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))

    const res = await GET()

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: '비용 통계를 불러오지 못했습니다.' })
  })
})
