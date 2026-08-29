'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import AuthCard from './AuthCard'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { loading, error, login } = useAuth()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const ok = await login(email, password)
    if (ok) window.location.assign('/')
  }

  return (
    <AuthCard title="다시 만나서 반가워요" tagline="오늘의 하루를 기록해 볼까요?" footer={<>
      계정이 없으신가요? <Link href="/signup" className="auth-link">회원가입</Link>
    </>}>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="login-email" className="auth-label">이메일</label>
          <input id="login-email" name="email" type="email" required autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="auth-input" />
        </div>
        <div className="auth-field">
          <label htmlFor="login-password" className="auth-label">비밀번호</label>
          <input id="login-password" name="password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="auth-input" />
        </div>
        {error && <p role="alert" className="auth-error">{error}</p>}
        <button type="submit" disabled={loading} aria-busy={loading} className="auth-submit">
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </AuthCard>
  )
}
