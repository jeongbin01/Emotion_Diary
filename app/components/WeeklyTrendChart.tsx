import { getEmotionTheme, type EmotionEffect } from '../lib/emotion-theme'
import { todayLabel, type PastDay } from '../lib/weeklyTrend'

type Props = {
  label: string
  // 오늘 이전 6일. 실제 일기가 없는 날은 emotionLabel이 null이다 — 이 경우 값을 지어내지 않고
  // "기록 없음"으로 표시한다. 조회 중이거나(첫 렌더) 백엔드가 응답하기 전에는 전달되지 않을 수
  // 있어 optional로 두고, 그동안은 6일 전부를 "기록 없음"으로 보여준다.
  pastDays?: PastDay[]
}

// 감정 날씨 효과별 대략적인 기분 점수(0=나쁨 ~ 100=좋음). 포인트의 y 위치를 정하는 데만 쓴다.
const EFFECT_MOOD: Record<EmotionEffect, number> = {
  sunny: 88,
  sunset: 76,
  forest: 64,
  star: 50,
  fog: 34,
  rain: 24,
  fire: 14,
}

const CHART_H = 96
const PAD_Y = 14

function yFor(mood: number) {
  return PAD_Y + (1 - mood / 100) * (CHART_H - PAD_Y * 2)
}

type DayPoint = {
  dayLabel: string
  icon: string
  color: string
  mood: number | null // null = 그 날 기록 없음
}

export default function WeeklyTrendChart({ label, pastDays }: Props) {
  const theme = getEmotionTheme(label)

  const past: DayPoint[] = (pastDays ?? Array.from({ length: 6 }, () => ({ dayLabel: '', emotionLabel: null }))).map(
    (d) => {
      if (!d.emotionLabel) {
        return { dayLabel: d.dayLabel, icon: '', color: '#B7B1A4', mood: null }
      }
      const dTheme = getEmotionTheme(d.emotionLabel)
      return { dayLabel: d.dayLabel, icon: dTheme.icon, color: dTheme.color, mood: EFFECT_MOOD[dTheme.effect] }
    },
  )
  const today: DayPoint = { dayLabel: todayLabel(), icon: theme.icon, color: theme.color, mood: EFFECT_MOOD[theme.effect] }
  const days = [...past, today]

  const points = days.map((d, i) => ({
    x: (i / (days.length - 1)) * 100,
    y: d.mood === null ? null : yFor(d.mood),
  }))

  // 기록이 있는 날끼리만 선으로 잇는다 — 빈 날을 가짜 값으로 보간하지 않는다.
  const segments: { x: number; y: number }[][] = []
  let current: { x: number; y: number }[] = []
  for (const p of points) {
    if (p.y === null) {
      if (current.length > 0) segments.push(current)
      current = []
    } else {
      current.push({ x: p.x, y: p.y })
    }
  }
  if (current.length > 0) segments.push(current)

  const pathFor = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

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
              {segments.map((seg, si) => (
                <g key={si}>
                  <path d={pathFor(seg)} fill="none" stroke="#ECE6FF" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  <path d={pathFor(seg)} fill="none" stroke="#8B74D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </g>
              ))}
              {points.map((p, i) =>
                p.y === null || i === points.length - 1 ? null : <circle key={i} cx={p.x} cy={p.y} r={2} fill="#8B74D9" />,
              )}
            </svg>
            {points.map((p, i) => {
              const isToday = i === points.length - 1
              const hasData = p.y !== null
              const y = p.y ?? CHART_H - PAD_Y // 기록 없는 날은 아래쪽 기준선에 옅게 표시
              return (
                <div
                  key={i}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center leading-none"
                  style={{ left: `${p.x}%`, top: `${y}px` }}
                >
                  {hasData ? (
                    <span
                      className={
                        isToday
                          ? 'flex items-center justify-center w-7 h-7 rounded-full text-base shadow-sm'
                          : 'text-base'
                      }
                      style={isToday ? { backgroundColor: days[i].color } : undefined}
                    >
                      {days[i].icon}
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full opacity-40" style={{ backgroundColor: '#B7B1A4' }} title="기록 없음" />
                  )}
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
                {d.dayLabel}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
