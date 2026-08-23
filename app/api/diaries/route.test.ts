import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

function req(query = '') {
  return new Request(`http://localhost/api/diaries${query}`)
}

describe('GET /api/diaries', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to limit=30 when no query param is given', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

    await GET(req())

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/diaries?limit=30'),
      expect.objectContaining({ cache: 'no-store' }),
    )
  })

  it('forwards an explicit limit param, URL-encoded', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

    await GET(req('?limit=5'))

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/diaries?limit=5'),
      expect.anything(),
    )
  })

  it('passes through the backend status and body', async () => {
    const diaries = [{ id: '1' }]
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(diaries), { status: 200 }))

    const res = await GET(req())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(diaries)
  })

  it('returns 500 when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))

    const res = await GET(req())

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: '최근 기록을 불러오지 못했습니다.' })
  })
})
