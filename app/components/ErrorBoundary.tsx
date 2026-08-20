'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  onReset: () => void
}

type State = {
  hasError: boolean
}

// 분석 결과가 예상 스키마를 벗어나면(예: AI 응답 필드 누락) 대시보드 렌더링 중 예외가 날 수
// 있다. 이 경계가 없으면 화면 전체가 흰 화면으로 날아가 사용자가 무슨 일이 일어났는지 알 수 없다.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DiaryResultDashboard 렌더링 중 오류:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false })
    this.props.onReset()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ds-card max-w-[640px] mx-auto mt-4 px-5 py-6 text-center">
          <p className="font-pretendard text-[15px] font-medium text-[#2B2B2B] mb-1">
            결과를 표시하는 중 문제가 발생했습니다.
          </p>
          <p className="font-pretendard text-[13px] text-[#6D6D6D] mb-4">
            잠시 후 다시 시도해주세요.
          </p>
          <button
            onClick={this.handleReset}
            className="ds-btn px-5 py-2.5 rounded-2xl border font-pretendard text-[14px] font-medium text-[#6D6D6D] hover:bg-white transition-colors duration-150"
            style={{ borderColor: '#E8E3DA' }}
          >
            다시 쓰기
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
