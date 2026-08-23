'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AnalysisTimeoutError,
  RateLimitedError,
  fetchPastDays,
  postAnalyze,
  type DiaryAnalysisResult,
} from '../lib/diaryApi'
import { buildPastDays, type PastDay } from '../lib/weeklyTrend'

const MIN_LENGTH = 10
const PAST_DAYS_LIMIT = 30

function messageForError(err: unknown): string {
  if (err instanceof RateLimitedError) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  if (err instanceof AnalysisTimeoutError) return '분석이 오래 걸려 중단됐습니다. 잠시 후 다시 시도해주세요.'
  if (err instanceof Error && err.message) return err.message
  return '감정 분석 중 오류가 발생했습니다.'
}

export function useDiaryAnalysis() {
  const [text, setTextRaw] = useState('')
  const [result, setResult] = useState<DiaryAnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pastDays, setPastDays] = useState<PastDay[] | undefined>(undefined)

  // 결과가 생기면(=방금 일기가 DB에 저장됨) 최근 일기 목록을 다시 불러와 최근 6일 감정을 채운다.
  // 이 조회는 대시보드 보조 차트일 뿐이라, 실패해도 에러 배너를 띄우지 않고 조용히 "기록 없음"
  // 상태로 남긴다(WeeklyTrendChart가 이미 그 상태를 처리한다).
  useEffect(() => {
    if (!result) return
    let cancelled = false
    fetchPastDays(PAST_DAYS_LIMIT)
      .then((diaries) => {
        if (cancelled) return
        setPastDays(buildPastDays(diaries))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [result])

  const setText = useCallback((value: string) => {
    setTextRaw(value)
    setError('')
  }, [])

  const tooShort = text.trim().length < MIN_LENGTH

  const analyze = useCallback(async () => {
    if (tooShort || loading) return
    setLoading(true)
    setResult(null)
    setError('')
    try {
      const data = await postAnalyze(text.trim())
      setResult(data)
    } catch (err) {
      setError(messageForError(err))
    } finally {
      setLoading(false)
    }
  }, [text, tooShort, loading])

  const reset = useCallback(() => {
    setResult(null)
    setTextRaw('')
    setError('')
    setPastDays(undefined)
  }, [])

  return { text, setText, tooShort, result, error, loading, pastDays, analyze, reset }
}
