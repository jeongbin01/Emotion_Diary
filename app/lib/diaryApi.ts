import type { DiarySummary } from './weeklyTrend'

export type EmotionScore = { label: string; score: number }
export type Cause = { label: string; percent: number }
export type Activity = { icon: string; label: string }
export type DiaryAnalysisResult = {
  label: string
  confidence: number
  aiOneLiner: string
  aiMessage: string
  emotions: EmotionScore[]
  causes: Cause[]
  keywords: string[]
  mindState: string
  growthPoint: string
  tomorrowMessage: string
  activities: Activity[]
  quote: string
}

// analyze는 KcBERT/FastText 추론 + (조건부) Gemini 호출까지 포함해 오래 걸릴 수 있어 백엔드
// 타임아웃(30s)보다 여유를 두고, pastDays는 대시보드 보조 데이터라 짧게 끊는다.
const ANALYZE_TIMEOUT_MS = 35_000
const PAST_DAYS_TIMEOUT_MS = 5_000

export class RateLimitedError extends Error {}
export class AnalysisTimeoutError extends Error {}
export class ServerError extends Error {}
export class NetworkError extends Error {}

function errorForStatus(status: number, message: string): Error {
  if (status === 429) return new RateLimitedError(message)
  if (status === 504) return new AnalysisTimeoutError(message)
  return new ServerError(message)
}

export async function postAnalyze(text: string): Promise<DiaryAnalysisResult> {
  let res: Response
  try {
    res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(ANALYZE_TIMEOUT_MS),
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new AnalysisTimeoutError('분석 요청이 시간 내에 응답하지 않았습니다. 잠시 후 다시 시도해주세요.')
    }
    throw new NetworkError('감정 분석 요청에 실패했습니다. 네트워크 상태를 확인해주세요.')
  }

  const data = await res.json().catch(() => null)
  if (!res.ok || data?.error) {
    throw errorForStatus(res.status, data?.error ?? '감정 분석 중 오류가 발생했습니다.')
  }
  return data as DiaryAnalysisResult
}

export async function fetchPastDays(limit: number): Promise<DiarySummary[]> {
  const res = await fetch(`/api/diaries?limit=${limit}`, {
    signal: AbortSignal.timeout(PAST_DAYS_TIMEOUT_MS),
  })
  const data = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('예상하지 못한 응답 형식입니다.')
  }
  return data
}
