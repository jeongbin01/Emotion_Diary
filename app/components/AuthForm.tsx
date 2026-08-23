'use client'

import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'

type Mode = 'login' | 'signup'

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const { loading, error, login, signup } = useAuth()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccessMessage('')

    if (mode === 'login') {
      const ok = await login(email, password)
      if (ok) window.location.assign('/')
      return
    }

    const ok = await signup(email, password)
    if (ok) {
      setSuccessMessage('회원가입이 완료됐습니다. 로그인해주세요.')
      setMode('login')
      setPassword('')
    }
  }

  const toggleMode = () => {
    setMode((current) => (current === 'login' ? 'signup' : 'login'))
    setSuccessMessage('')
  }

  return (
    <div className="fade-up ds-card max-w-[440px] mx-auto p-6 sm:p-8">
      <h1 className="font-pretendard text-[20px] font-semibold text-[#2B2B2B] mb-6 text-center">
        {mode === 'login' ? '로그인' : '회원가입'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="auth-email" className="block font-pretendard text-[13px] font-medium text-[#2B2B2B] mb-1.5">
            이메일
          </label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[#E8E3DA] bg-[#FBFAF7] px-4 py-2.5 font-pretendard text-[14px] text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#ECE6FF]"
          />
        </div>

        <div>
          <label
            htmlFor="auth-password"
            className="block font-pretendard text-[13px] font-medium text-[#2B2B2B] mb-1.5"
          >
            비밀번호
          </label>
          <input
            id="auth-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[#E8E3DA] bg-[#FBFAF7] px-4 py-2.5 font-pretendard text-[14px] text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#ECE6FF]"
          />
        </div>

        {error && (
          <p role="alert" className="font-pretendard text-[13px] text-[#EB6A6A]">
            {error}
          </p>
        )}
        {successMessage && <p className="font-pretendard text-[13px] text-[#5FAE73]">{successMessage}</p>}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="ds-btn w-full py-3 rounded-2xl font-pretendard text-[15px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#8B74D9' }}
        >
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>

      <button
        type="button"
        onClick={toggleMode}
        className="mt-4 w-full text-center font-pretendard text-[13px] text-[#8B74D9]"
      >
        {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
      </button>
    </div>
  )
}
