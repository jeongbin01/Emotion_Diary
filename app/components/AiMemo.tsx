type Props = {
  message: string
}

export default function AiMemo({ message }: Props) {
  return (
    <div className="ds-card ds-card-hover p-6 lg:p-8" style={{ backgroundColor: '#FFF9EA', borderColor: '#F2DB92' }}>
      <p className="font-pretendard text-[18px] font-semibold text-[#2B2B2B] mb-4">AI 의 한마디</p>
      <p className="notepad-lines rounded-2xl px-5 pt-1 pb-4 font-pretendard text-[15px] text-[#2B2B2B] whitespace-pre-line">
        {message}
      </p>
    </div>
  )
}
