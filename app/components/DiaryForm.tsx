'use client'

import DiaryInputForm from './DiaryInputForm'
import DiaryResultDashboard from './DiaryResultDashboard'
import ErrorBanner from './ErrorBanner'
import ErrorBoundary from './ErrorBoundary'
import BrandMark from './auth/BrandMark'
import { useDiaryAnalysis } from '../hooks/useDiaryAnalysis'
import { useAuth } from '../hooks/useAuth'

export default function DiaryForm() {
  const { text, setText, tooShort, result, error, loading, pastDays, analyze, reset } = useDiaryAnalysis()
  const { isAuthenticated, logout } = useAuth()

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  if (!isAuthenticated) {
    return (
      <main className="dashboard-bg min-h-screen flex items-center justify-center px-5">
        <section className="auth-card notepad-lines fade-up w-full max-w-[420px] text-center">
          <div className="auth-brand">
            <BrandMark />
          </div>
          <h1 className="auth-title font-gaegu">오늘 하루, 기록해볼까요</h1>
          <p className="auth-tagline font-pretendard">이 노트는 로그인한 당신만 펼쳐볼 수 있어요.</p>
          <a href="/login" className="auth-submit inline-block">
            로그인 / 회원가입
          </a>
        </section>
      </main>
    )
  }

  return (
    <div className="dashboard-bg min-h-screen px-5 sm:px-8 lg:px-10 py-12 lg:py-16">
      <div className="w-full max-w-[1200px] mx-auto">

        <header className="fade-up text-center mb-10 lg:mb-14 relative">
          <button
            type="button"
            onClick={logout}
            className="absolute right-0 top-0 font-pretendard text-xs text-[#8B74D9]"
          >
            로그아웃
          </button>
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

        {result && (
          <ErrorBoundary onReset={reset}>
            <DiaryResultDashboard result={result} text={text} pastDays={pastDays} onReset={reset} />
          </ErrorBoundary>
        )}

      </div>
    </div>
  )
}
