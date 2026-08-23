import { Brain, Heart, Sprout, Star, type LucideIcon } from 'lucide-react'

type Cause = { label: string; percent: number }

type Props = {
  mindState: string
  causes: Cause[]
  growthPoint: string
  tomorrowMessage: string
}

export default function EmotionDetailSummary({ mindState, causes, growthPoint, tomorrowMessage }: Props) {
  const topCauses = [...causes].sort((a, b) => b.percent - a.percent).slice(0, 2)
  const causeText =
    topCauses.length > 0
      ? `${topCauses.map((c) => c.label).join(' · ')}이(가) 감정에 큰 영향을 주었어요.`
      : ''

  const items: { icon: LucideIcon; tint: string; bg: string; title: string; desc: string }[] = [
    { icon: Brain, tint: '#8B74D9', bg: '#F5F2FF', title: '심리 상태', desc: mindState },
    { icon: Heart, tint: '#E88FA0', bg: '#FDEDF0', title: '주요 원인', desc: causeText },
    { icon: Sprout, tint: '#7DCB88', bg: '#EAF7EC', title: '성장 포인트', desc: growthPoint },
    { icon: Star, tint: '#E0AA3E', bg: '#FBF3E1', title: '내일의 나에게', desc: tomorrowMessage },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.title} className="ds-card ds-card-hover p-6 flex flex-col items-center text-center gap-3">
          <span
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: item.bg }}
          >
            <item.icon size={20} strokeWidth={2} color={item.tint} aria-hidden="true" />
          </span>
          <p className="font-pretendard text-[15px] font-semibold text-[#2B2B2B]">{item.title}</p>
          <p className="font-pretendard text-[13px] text-[#6D6D6D] leading-relaxed">{item.desc}</p>
        </div>
      ))}
    </div>
  )
}
