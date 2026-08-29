'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import AuthCard from './AuthCard'

const MIN_PASSWORD_LENGTH = 8

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const { loading, error, signup } = useAuth()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setSuccessMessage('')
    if (password.length < MIN_PASSWORD_LENGTH) return setFormError(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`)
    if (password !== confirmPassword) return setFormError('비밀번호가 서로 다릅니다.')
    if (!agreed) return setFormError('약관에 동의해 주세요.')

    const ok = await signup(email, password)
    if (ok) setSuccessMessage('회원가입이 완료되었습니다. 이제 로그인해 주세요.')
  }

  return (
    <AuthCard title="첫 페이지를 함께 볼까요?" tagline="오늘부터 하루하루를 기록해 봐요." footer={<>
      이미 계정이 있으신가요? <Link href="/login" className="auth-link">로그인</Link>
    </>}>
      {successMessage ? (
        <p role="status" className="auth-success">
          {successMessage} <Link href="/login" className="auth-link">로그인하기</Link>
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="signup-email" className="auth-label">이메일</label>
            <input id="signup-email" name="email" type="email" required autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="auth-input" />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-password" className="auth-label">비밀번호</label>
            <input id="signup-password" name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="auth-input" />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-confirm-password" className="auth-label">비밀번호 확인</label>
            <input id="signup-confirm-password" name="confirmPassword" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="auth-input" />
          </div>
          <label className="auth-checkbox">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>이용약관 및 개인정보 처리방침에 동의합니다.</span>
          </label>
          {(formError || error) && <p role="alert" className="auth-error">{formError || error}</p>}
          <button type="submit" disabled={loading} aria-busy={loading} className="auth-submit">
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>
      )}
    </AuthCard>
  )
}
