'use client'

import { useCallback, useState } from 'react'
import { EmailTakenError, InvalidCredentialsError, ValidationError, login as loginRequest, signup as signupRequest } from '../lib/authApi'
import { clearToken, getToken, setToken } from '../lib/authStorage'

function messageForError(error: unknown): string {
  if (error instanceof EmailTakenError) return '이미 가입된 이메일입니다.'
  if (error instanceof InvalidCredentialsError) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (error instanceof ValidationError) return '입력값을 다시 확인해 주세요.'
  if (error instanceof Error && error.message) return error.message
  return '요청 처리 중 오류가 발생했습니다.'
}

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(() => getToken() !== null)

  const signup = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError('')
    try {
      await signupRequest(email, password)
      return true
    } catch (requestError) {
      setError(messageForError(requestError))
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError('')
    try {
      const token = await loginRequest(email, password)
      setToken(token)
      setIsAuthenticated(true)
      return true
    } catch (requestError) {
      setError(messageForError(requestError))
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setIsAuthenticated(false)
  }, [])

  return { loading, error, isAuthenticated, signup, login, logout }
}
