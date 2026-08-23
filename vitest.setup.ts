import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// globals: true를 켜지 않아 afterEach가 전역으로 노출되지 않는다 — RTL의 자동 cleanup이
// 이를 감지하지 못해 각 컴포넌트 테스트 사이에 DOM이 남는다. 명시적으로 정리한다.
afterEach(() => {
  cleanup()
})
