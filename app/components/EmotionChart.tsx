import { getEmotionTheme } from '../lib/emotion-theme'

type EmotionScore = { label: string; score: number }

type Props = {
  emotions: EmotionScore[]
}

export default function EmotionChart({ emotions }: Props) {
  const sorted = [...emotions].sort((a, b) => b.score - a.score)

  return (
    <div className="ds-card ds-card-hover p-6 lg:p-8 result-fade-in">
      <p className="font-pretendard text-[18px] font-semibold text-[#2B2B2B] mb-5">전체 감정 분포</p>
      <div className="space-y-3">
        {sorted.map((e) => {
          const theme = getEmotionTheme(e.label)
          const pct = (e.score * 100).toFixed(1)
          return (
            <div key={e.label} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-center text-sm leading-none" title={theme.display}>
                {theme.icon}
              </span>
              <span className="font-pretendard text-[13px] text-[#6D6D6D] w-14 shrink-0 text-left whitespace-nowrap">
                {e.label}
              </span>
              <div className="ds-progress-track flex-1">
                <div className="ds-progress-fill" style={{ width: `${pct}%`, backgroundColor: theme.color }} />
              </div>
              <span className="font-pretendard text-xs text-[#6D6D6D] w-10 shrink-0">
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
