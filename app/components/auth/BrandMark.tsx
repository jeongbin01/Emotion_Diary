import Image from 'next/image'

type BrandMarkProps = {
  className?: string
}

export default function BrandMark({ className }: BrandMarkProps) {
  return (
    <Image
      src="/brand-mark.png"
      alt="오늘의 하루 로고"
      fill
      sizes="500px"
      className={className}
      style={{ objectFit: 'contain' }}
      priority
    />
  )
}
