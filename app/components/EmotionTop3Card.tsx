import { getEmotionTheme } from '../lib/emotion-theme'

type EmotionScore = { label: string; score: number }

type Props = {
  emotions: EmotionScore[]
}

export default function EmotionTop3Card({ emotions }: Props) {
  const top3 = [...emotions].sort((a, b) => b.score - a.score).slice(0, 3)

  return (
    <div className="ds-card ds-card-hover p-6 lg:p-8">
      <p className="font-pretendard text-[18px] font-semibold text-[#2B2B2B] mb-5">감정 분포 TOP 3</p>
      <div className="space-y-5">
        {top3.map((e) => {
          const theme = getEmotionTheme(e.label)
          const pct = e.score * 100
          return (
            <div key={e.label} className="flex items-center gap-3">
              <span className="text-xl leading-none shrink-0">{theme.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1.5 gap-2">
                  <span className="font-pretendard text-[13px] text-[#2B2B2B] truncate">{theme.display}</span>
                  <span className="font-pretendard text-[13px] font-semibold text-[#2B2B2B] shrink-0">
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="ds-progress-track">
                  <div className="ds-progress-fill" style={{ width: `${pct}%`, backgroundColor: theme.color }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
