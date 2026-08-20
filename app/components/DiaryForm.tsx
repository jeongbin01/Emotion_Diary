'use client'

import DiaryInputForm from './DiaryInputForm'
import DiaryResultDashboard from './DiaryResultDashboard'
import ErrorBanner from './ErrorBanner'
import { useDiaryAnalysis } from '../hooks/useDiaryAnalysis'

export default function DiaryForm() {
  const { text, setText, tooShort, result, error, loading, pastDays, analyze, reset } = useDiaryAnalysis()

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <div className="dashboard-bg min-h-screen px-5 sm:px-8 lg:px-10 py-12 lg:py-16">
      <div className="w-full max-w-[1200px] mx-auto">

        {/* 헤더 */}
        <header className="fade-up text-center mb-10 lg:mb-14">
          <h1 className="font-pretendard font-bold text-[32px] sm:text-[38px] lg:text-[44px] text-[#2B2B2B]">
            오늘의 하루
          </h1>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="h-px w-8 sm:w-10 bg-[#8B74D9]/40" />
            <p className="font-pretendard text-[13px] font-medium text-[#8B74D9]">{today}</p>
            <span className="h-px w-8 sm:w-10 bg-[#8B74D9]/40" />
          </div>
        </header>

        {!result && (
          <DiaryInputForm value={text} onChange={setText} onSubmit={analyze} loading={loading} tooShort={tooShort} />
        )}

        {error && <ErrorBanner message={error} />}

        {result && <DiaryResultDashboard result={result} text={text} pastDays={pastDays} onReset={reset} />}

      </div>
    </div>
  )
}
