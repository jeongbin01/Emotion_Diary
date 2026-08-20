'use client'

import { Loader2, Stamp } from 'lucide-react'

type Props = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  loading: boolean
  tooShort: boolean
}

export default function DiaryInputForm({ value, onChange, onSubmit, loading, tooShort }: Props) {
  return (
    <div className="fade-up ds-card max-w-[640px] mx-auto p-6 sm:p-8">
      <p className="font-pretendard text-[15px] font-medium text-[#2B2B2B] mb-4">
        오늘 하루 어땠나요?
      </p>

      <div className="relative rounded-2xl border border-[#E8E3DA] bg-[#FBFAF7] overflow-hidden focus-within:ring-2 focus-within:ring-[#ECE6FF] transition-shadow">
        {/* 빨간 여백선 */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ left: '38px', width: '1px', backgroundColor: '#D98A82', opacity: 0.5 }}
        />
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="오늘 있었던 일을 자유롭게 적어보세요..."
          className="notepad-lines w-full resize-none bg-transparent pr-5 pt-1 pb-3 font-gaegu text-[20px] text-[#2B2B2B] placeholder-[#B7B1A4] focus:outline-none"
          style={{ minHeight: '190px', paddingLeft: '52px' }}
        />
      </div>

      <div className="mt-4 space-y-3">
        {value.trim().length > 0 && tooShort && (
          <p className="font-pretendard text-[13px] text-[#EB6A6A]">
            10자 이상 적어주세요
          </p>
        )}
        <button
          onClick={onSubmit}
          disabled={tooShort || loading}
          className="ds-btn w-full py-3.5 rounded-2xl font-pretendard text-[15px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#8B74D9' }}
        >
          {loading ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              감정을 분석하는 중...
            </>
          ) : (
            <>
              <Stamp size={17} strokeWidth={2} />
              오늘의 감정 기록하기
            </>
          )}
        </button>
      </div>
    </div>
  )
}
