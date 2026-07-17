import { getEmotionTheme, type EmotionEffect } from '../lib/emotion-theme'

type Props = {
  label: string
}

// 감정 날씨 효과별 대략적인 기분 점수(0=나쁨 ~ 100=좋음). 오늘 포인트의 y 위치를 정하는 데만 쓴다.
const EFFECT_MOOD: Record<EmotionEffect, number> = {
  sunny: 88,
  sunset: 76,
  forest: 64,
  star: 50,
  fog: 34,
  rain: 24,
  fire: 14,
}

// 히스토리 저장 기능 도입 전까지의 샘플 값 (오늘=일요일 자리만 실제 분석 결과로 대체된다)
const MOCK_DAYS = [
  { day: '월', icon: '😊', mood: 78 },
  { day: '화', icon: '🙂', mood: 62 },
  { day: '수', icon: '😕', mood: 45 },
  { day: '목', icon: '😩', mood: 20 },
  { day: '금', icon: '😔', mood: 34 },
  { day: '토', icon: '😄', mood: 85 },
]

const CHART_H = 96
const PAD_Y = 14

function yFor(mood: number) {
  return PAD_Y + (1 - mood / 100) * (CHART_H - PAD_Y * 2)
}

export default function WeeklyTrendChart({ label }: Props) {
  const theme = getEmotionTheme(label)
  const today = { day: '일', icon: theme.icon, mood: EFFECT_MOOD[theme.effect], color: theme.color }
  const days = [...MOCK_DAYS, today]

  const points = days.map((d, i) => ({
    x: (i / (days.length - 1)) * 100,
    y: yFor(d.mood),
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className="ds-card ds-card-hover p-6 lg:p-8">
      <p className="font-pretendard text-[18px] font-semibold text-[#2B2B2B] mb-5">최근 7일 감정 변화</p>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-[14px] shrink-0">
          <span className="font-pretendard text-[10px] text-[#6D6D6D]">좋음</span>
          <span className="font-pretendard text-[10px] text-[#6D6D6D]">보통</span>
          <span className="font-pretendard text-[10px] text-[#6D6D6D]">나쁨</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="relative" style={{ height: CHART_H }}>
            <svg viewBox={`0 0 100 ${CHART_H}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <path d={linePath} fill="none" stroke="#ECE6FF" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={linePath} fill="none" stroke="#8B74D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 0 : 2} fill="#8B74D9" />
              ))}
            </svg>
            {points.map((p, i) => {
              const isToday = i === points.length - 1
              return (
                <div
                  key={i}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center leading-none"
                  style={{ left: `${p.x}%`, top: `${p.y}px` }}
                >
                  <span
                    className={
                      isToday
                        ? 'flex items-center justify-center w-7 h-7 rounded-full text-base shadow-sm'
                        : 'text-base'
                    }
                    style={isToday ? { backgroundColor: theme.color } : undefined}
                  >
                    {days[i].icon}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between">
            {days.map((d, i) => (
              <span
                key={i}
                className="font-pretendard text-[10px] flex-1 text-center"
                style={{ color: i === days.length - 1 ? theme.color : '#6D6D6D', fontWeight: i === days.length - 1 ? 600 : 400 }}
              >
                {d.day}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
