import type { Metadata } from 'next'
import { Gaegu } from 'next/font/google'
import './globals.css'

const gaegu = Gaegu({
  weight: ['300', '400', '700'],
  variable: '--font-gaegu',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '오늘의 하루',
  description: '오늘 하루를 기록하면 AI가 감정을 분석해드립니다',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={gaegu.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
