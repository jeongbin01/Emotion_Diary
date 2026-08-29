import type { ReactNode } from 'react'
import BrandMark from './BrandMark'

type AuthCardProps = {
  title: string
  tagline: string
  children: ReactNode
  footer?: ReactNode
}

export default function AuthCard({ title, tagline, children, footer }: AuthCardProps) {
  return (
    <section className="auth-card notepad-lines fade-up w-full max-w-[420px]">
      <div className="auth-brand">
        <BrandMark />
      </div>
      <h1 className="auth-title font-gaegu">{title}</h1>
      <p className="auth-tagline font-pretendard">{tagline}</p>
      {children}
      {footer && <div className="auth-footer">{footer}</div>}
    </section>
  )
}
