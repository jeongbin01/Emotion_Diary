'use client'

import { Loader2, Stamp } from 'lucide-react'
import EmotionRingCard from './EmotionRingCard'
import EmotionSummaryCard from './EmotionSummaryCard'
import EmotionTop3Card from './EmotionTop3Card'
import CauseDonutChart from './CauseDonutChart'
import WeeklyTrendChart from './WeeklyTrendChart'
import DiaryEntry from './DiaryEntry'
import AiMemo from './AiMemo'
import ActivitiesCard from './ActivitiesCard'
import QuoteCard from './QuoteCard'
import EmotionDetailSummary from './EmotionDetailSummary'
import EmotionChart from './EmotionChart'
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

        {/* 입력 카드 */}
        {!result && (
          <div className="fade-up ds-card max-w-[640px] mx-auto p-6 sm:p-8">
            <p className="font-pretendard text-[15px] font-medium text-[#2B2B2B] mb-4">
              오늘 하루 어땠나요?
            </p>

            <div className="relative rounded-2xl border border-[#E8E3DA] bg-[#FBFAF7] overflow-hidden focus-within:ring-2 focus-within:ring-[#ECE6FF] transition-shadow">
              {/* 빨간 여백선 */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{ left: '38px', width: '1px', backgroundColor: '#D98A82', opacity: 0.5 }}
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="오늘 있었던 일을 자유롭게 적어보세요..."
                className="notepad-lines w-full resize-none bg-transparent pr-5 pt-1 pb-3 font-gaegu text-[20px] text-[#2B2B2B] placeholder-[#B7B1A4] focus:outline-none"
                style={{ minHeight: '190px', paddingLeft: '52px' }}
              />
            </div>

            <div className="mt-4 space-y-3">
              {text.trim().length > 0 && tooShort && (
                <p className="font-pretendard text-[13px] text-[#EB6A6A]">
                  10자 이상 적어주세요
                </p>
              )}
              <button
                onClick={analyze}
                disabled={tooShort || loading}
                className="ds-btn w-full py-3.5 rounded-2xl font-pretendard text-[15px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#8B74D9' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    감정을 분석하는 중...
                  </>
                ) : (
                  <>
                    <Stamp size={17} strokeWidth={2} />
                    오늘의 감정 기록하기
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="ds-card max-w-[640px] mx-auto mt-4 px-5 py-4 font-pretendard text-[14px]" style={{ color: '#EB6A6A', borderColor: '#F5C6C6', backgroundColor: '#FDF1F1' }}>
            {error}
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div className="space-y-6">
            {/* Row 1: 오늘의 감정 / 감정 요약 */}
            <div className="fade-up grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EmotionRingCard label={result.label} confidence={result.confidence} />
              <EmotionSummaryCard
                label={result.label}
                confidence={result.confidence}
                aiOneLiner={result.aiOneLiner}
                keywords={result.keywords}
              />
            </div>

            {/* Row 2: 감정 분포 / 감정 원인 분석 / 최근 감정 변화 */}
            <div className="fade-up grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ animationDelay: '0.08s' }}>
              {result.emotions?.length > 0 && <EmotionTop3Card emotions={result.emotions} />}
              {result.causes?.length > 0 && <CauseDonutChart label={result.label} causes={result.causes} />}
              <WeeklyTrendChart label={result.label} pastDays={pastDays} />
            </div>

            {/* Row 3: 오늘의 기록 / AI 추천 활동 / AI 한마디 / 오늘의 문장 (2x2 그리드로 행 높이를 맞춘다) */}
            <div className="fade-up grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ animationDelay: '0.16s' }}>
              <DiaryEntry text={text} />
              {result.activities?.length > 0 && <ActivitiesCard activities={result.activities} />}
              {result.aiMessage && <AiMemo message={result.aiMessage} />}
              {result.quote && <QuoteCard label={result.label} quote={result.quote} />}
            </div>

            {result.emotions?.length > 0 && (
              <div className="fade-up" style={{ animationDelay: '0.2s' }}>
                <EmotionChart emotions={result.emotions} />
              </div>
            )}

            {/* Row 4: 감정 분석 상세 */}
            <div className="fade-up" style={{ animationDelay: '0.24s' }}>
              <EmotionDetailSummary
                mindState={result.mindState}
                causes={result.causes}
                growthPoint={result.growthPoint}
                tomorrowMessage={result.tomorrowMessage}
              />
            </div>

            <button
              onClick={reset}
              className="ds-btn w-full py-3.5 rounded-2xl border font-pretendard text-[15px] font-medium text-[#6D6D6D] hover:bg-white transition-colors duration-150"
              style={{ borderColor: '#E8E3DA' }}
            >
              다시 쓰기
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
