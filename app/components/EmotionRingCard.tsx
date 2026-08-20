'use client'

import { useEffect, useState } from 'react'
import { Clock, TrendingUp } from 'lucide-react'
import { confidenceToStars } from '../lib/confidence'
import { getEmotionTheme } from '../lib/emotion-theme'

type Props = {
  label: string
  confidence: number
}

const RADIUS = 68
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function EmotionRingCard({ label, confidence }: Props) {
  const [progress, setProgress] = useState(0)
  const theme = getEmotionTheme(label)
  const pct = confidence * 100
  const level = confidenceToStars(confidence)
  const time = new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })

  useEffect(() => {
    const id = setTimeout(() => setProgress(pct), 100)
    return () => clearTimeout(id)
  }, [pct])

  return (
    <div className="ds-card ds-card-hover p-6 lg:p-8 flex flex-col items-center text-center">
      <span
        className="ds-tag mb-5"
        style={{ backgroundColor: `${theme.color}1A`, color: theme.color }}
      >
        오늘의 감정
      </span>

      <div className="relative w-[168px] h-[168px]">
        <svg viewBox="0 0 168 168" className="w-full h-full -rotate-90">
          <circle cx="84" cy="84" r={RADIUS} fill="none" stroke="#F0EDFB" strokeWidth="8" />
          <circle
            cx="84"
            cy="84"
            r={RADIUS}
            fill="none"
            stroke={theme.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl leading-none">{theme.icon}</span>
          <span className="mt-2 font-pretendard text-xl font-bold" style={{ color: theme.color }}>
            {pct.toFixed(0)}%
          </span>
        </div>

        {theme.icon === '😴' && (
          <div className="absolute top-3 right-4 font-pretendard font-bold select-none pointer-events-none leading-none">
            <span className="block text-base" style={{ color: theme.color }}>Zz</span>
            <span className="block text-[10px] ml-2 -mt-0.5" style={{ color: theme.color }}>z</span>
          </div>
        )}
      </div>

      <p className="mt-5 font-pretendard text-xl font-semibold text-[#2B2B2B]">{theme.display}</p>
      <span
        className="mt-2 ds-tag"
        style={{ backgroundColor: `${theme.color}1A`, color: theme.color }}
      >
        Lv.{level}
      </span>

      {/* 히스토리 저장 기능 도입 전까지의 샘플 값 */}
      <div
        className="mt-4 inline-flex items-center gap-1 px-3 py-1 rounded-full font-pretendard text-xs font-medium"
        style={{ backgroundColor: 'rgba(235, 106, 106, 0.1)', color: '#EB6A6A' }}
      >
        <TrendingUp size={13} strokeWidth={2.5} />
        <span>어제보다 +12%</span>
      </div>
      <p className="mt-3 flex items-center gap-1 font-pretendard text-xs text-[#6D6D6D]">
        <Clock size={13} strokeWidth={2} aria-hidden="true" />
        {time}
      </p>
    </div>
  )
}
