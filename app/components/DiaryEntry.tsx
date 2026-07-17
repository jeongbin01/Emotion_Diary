type Props = {
  text: string
}

export default function DiaryEntry({ text }: Props) {
  return (
    <div className="ds-card ds-card-hover p-6 lg:p-8">
      <p className="font-pretendard text-[18px] font-semibold text-[#2B2B2B] mb-4">오늘의 기록</p>
      <p className="notepad-lines rounded-2xl bg-[#FDF6D8] px-5 pt-1 pb-4 font-gaegu text-[19px] text-[#2B2B2B] whitespace-pre-wrap">
        {text}
      </p>
    </div>
  )
}
