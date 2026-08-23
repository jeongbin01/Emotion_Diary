'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { getEmotionTheme } from '../lib/emotion-theme'

type Props = {
  label: string
  quote: string
}

export default function QuoteCard({ label, quote }: Props) {
  const [liked, setLiked] = useState(false)
  const theme = getEmotionTheme(label)

  return (
    <div className="ds-card ds-card-hover p-6 lg:p-8 flex flex-col items-center text-center">
      <div className="flex items-center justify-between w-full mb-4">
        <p className="font-pretendard text-[18px] font-semibold text-[#2B2B2B]">오늘의 문장</p>
        <button
          type="button"
          onClick={() => setLiked((v) => !v)}
          aria-pressed={liked}
          aria-label="오늘의 문장 좋아요"
          className="ds-btn shrink-0"
        >
          <Heart
            size={18}
            strokeWidth={2}
            color={liked ? theme.color : '#B9AEE0'}
            fill={liked ? theme.color : 'transparent'}
            aria-hidden="true"
          />
        </button>
      </div>
      <p
        className="notepad-lines rounded-2xl w-full min-h-[76px] flex items-center justify-center px-5 font-pretendard text-lg italic"
        style={{ letterSpacing: '-0.01em', backgroundColor: `${theme.color}14`, color: theme.color }}
      >
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  )
}
