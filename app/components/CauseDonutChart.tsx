import { getEmotionTheme } from '../lib/emotion-theme'

type Cause = { label: string; percent: number }

type Props = {
  label: string
  causes: Cause[]
}

// 오늘의 감정 색상에서 파생된 톤(진한 것부터 옅은 것 순)으로, 원인이 여러 개여도 서로 구분되면서
// 전체적으로는 감정 고유 색상 계열 안에서 어울리도록 한다.
const SHADE_MIXES = [
  { with: 'black', pct: 0 },
  { with: 'white', pct: 30 },
  { with: 'black', pct: 20 },
  { with: 'white', pct: 55 },
  { with: 'white', pct: 15 },
  { with: 'black', pct: 35 },
]

function buildPalette(color: string) {
  return SHADE_MIXES.map(({ with: mixWith, pct }) =>
    pct === 0 ? color : `color-mix(in srgb, ${color} ${100 - pct}%, ${mixWith})`,
  )
}

const RADIUS = 46
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function CauseDonutChart({ label, causes }: Props) {
  const theme = getEmotionTheme(label)
  const palette = buildPalette(theme.color)
  const total = causes.reduce((sum, c) => sum + c.percent, 0) || 1
  const offsets: number[] = []
  causes.reduce((acc, c) => {
    offsets.push(acc)
    return acc + (c.percent / total) * CIRCUMFERENCE
  }, 0)

  return (
    <div className="ds-card ds-card-hover p-6 lg:p-8">
      <p className="font-pretendard text-[18px] font-semibold text-[#2B2B2B] mb-5">감정 원인 분석</p>
      <div className="flex items-center gap-3">
        <div className="relative w-[112px] h-[112px] shrink-0">
          <svg viewBox="0 0 112 112" className="w-full h-full -rotate-90">
            <circle cx="56" cy="56" r={RADIUS} fill="none" stroke="#F3F2FA" strokeWidth="16" />
            {causes.map((c, i) => {
              const dash = (c.percent / total) * CIRCUMFERENCE
              return (
                <circle
                  key={c.label}
                  cx="56"
                  cy="56"
                  r={RADIUS}
                  fill="none"
                  stroke={palette[i % palette.length]}
                  strokeWidth="16"
                  strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                  strokeDashoffset={-offsets[i]}
                />
              )
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
            <span className="font-pretendard text-xs text-[#6D6D6D]">원인</span>
            <span className="font-pretendard text-xs text-[#6D6D6D]">비율</span>
          </div>
        </div>
        <ul className="flex-1 space-y-2 min-w-0">
          {causes.map((c, i) => (
            <li key={c.label} className="flex items-start gap-2 font-pretendard text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                style={{ backgroundColor: palette[i % palette.length] }}
              />
              <span className="text-[#2B2B2B] flex-1 break-keep leading-snug">{c.label}</span>
              <span className="text-[#6D6D6D] shrink-0">{Math.round(c.percent)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
