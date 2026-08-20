import type { DiaryAnalysisResult } from '../lib/diaryApi'
import type { PastDay } from '../lib/weeklyTrend'
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

type Props = {
  result: DiaryAnalysisResult
  text: string
  pastDays: PastDay[] | undefined
  onReset: () => void
}

export default function DiaryResultDashboard({ result, text, pastDays, onReset }: Props) {
  return (
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
        onClick={onReset}
        className="ds-btn w-full py-3.5 rounded-2xl border font-pretendard text-[15px] font-medium text-[#6D6D6D] hover:bg-white transition-colors duration-150"
        style={{ borderColor: '#E8E3DA' }}
      >
        다시 쓰기
      </button>
    </div>
  )
}
