type Props = {
  message: string
}

export default function ErrorBanner({ message }: Props) {
  return (
    <div
      role="alert"
      className="ds-card max-w-[640px] mx-auto mt-4 px-5 py-4 font-pretendard text-[14px]"
      style={{ color: '#EB6A6A', borderColor: '#F5C6C6', backgroundColor: '#FDF1F1' }}
    >
      {message}
    </div>
  )
}
