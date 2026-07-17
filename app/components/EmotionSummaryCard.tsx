import { Star } from 'lucide-react'
import { getEmotionTheme } from '../lib/emotion-theme'

type Props = {
  label: string
  confidence: number
  aiOneLiner?: string
  keywords?: string[]
}

export default function EmotionSummaryCard({ label, confidence, aiOneLiner, keywords = [] }: Props) {
  const theme = getEmotionTheme(label)
  const pct = confidence * 100
  const filledStars = Math.min(5, Math.max(1, Math.round(confidence * 5)))

  return (
    <div className="ds-card ds-card-hover p-6 lg:p-8">
      <p className="font-pretendard text-[18px] font-semibold text-[#2B2B2B] mb-5">오늘의 감정 요약</p>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-3xl leading-none">{theme.icon}</span>
        <span className="font-pretendard text-2xl font-semibold text-[#2B2B2B]">{theme.display}</span>
      </div>

      <p className="font-pretendard text-4xl sm:text-5xl font-bold mb-4" style={{ color: theme.color }}>
        {pct.toFixed(1)}
        <span className="text-xl align-top">%</span>
      </p>

      <p className="font-pretendard text-[13px] font-medium text-[#6D6D6D] mb-1.5">감정 신뢰도</p>
      <div className="flex items-center gap-3 mb-5">
        <div className="ds-progress-track flex-1">
          <div className="ds-progress-fill" style={{ width: `${pct}%`, backgroundColor: theme.color }} />
        </div>
        <span className="font-pretendard text-[13px] font-medium text-[#6D6D6D] shrink-0">{pct.toFixed(0)}%</span>
      </div>

      <p className="font-pretendard text-[13px] font-medium text-[#6D6D6D] mb-1.5">감정 강도</p>
      <div className="flex items-center gap-1 mb-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={18}
            strokeWidth={2}
            color={i < filledStars ? theme.color : '#E8E3DA'}
            fill={i < filledStars ? theme.color : 'transparent'}
          />
        ))}
      </div>

      {aiOneLiner && (
        <div className="mb-5">
          <p className="font-pretendard text-[13px] font-medium text-[#6D6D6D] mb-1.5">AI 분석 한 줄</p>
          <p
            className="rounded-xl px-4 py-3 font-pretendard text-[15px] font-medium leading-relaxed whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ backgroundColor: `${theme.color}1A`, color: theme.color }}
          >
            {aiOneLiner}
          </p>
        </div>
      )}

      {keywords.length > 0 && (
        <div>
          <p className="font-pretendard text-[13px] font-medium text-[#6D6D6D] mb-2">오늘의 키워드</p>
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span
                key={k}
                className="ds-tag"
                style={{ backgroundColor: `${theme.color}1A`, color: theme.color }}
              >
                #{k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
