// GET /api/diaries로 받은 최근 일기 목록을, WeeklyTrendChart가 그릴 "최근 6일" 배열로 묶는다.
// 오늘은 방금 분석한 result.label을 바로 쓰므로(요청 왕복을 기다릴 필요가 없다) 여기서는
// 오늘 이전 6일만 다룬다. 실제 일기가 없는 날은 null로 남겨두고, 차트가 그 날을 "기록 없음"으로
// 표시한다 — 샘플 값으로 채워 넣지 않는다(README/설계 문서에서 강조한 "숫자를 지어내지 않는다"는
// 원칙을 프론트 쪽에도 그대로 적용한 것).

export type DiarySummary = {
  createdAt: string
  emotionAnalysis?: { label: string } | null
}

export type PastDay = { dayLabel: string; emotionLabel: string | null }

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function todayLabel(now: Date = new Date()): string {
  return WEEKDAY_LABELS[now.getDay()]
}

// diaries는 backend가 이미 createdAt 내림차순(최신 우선)으로 정렬해 준다는 전제.
// 같은 날짜에 diaries가 여러 개면(재작성 등) 가장 최근 것을 그 날의 대표 감정으로 쓴다.
export function buildPastDays(diaries: DiarySummary[], now: Date = new Date()): PastDay[] {
  const latestLabelByDate = new Map<string, string>()
  for (const diary of diaries) {
    const created = new Date(diary.createdAt)
    if (Number.isNaN(created.getTime())) continue
    const key = toLocalDateKey(created)
    if (!latestLabelByDate.has(key) && diary.emotionAnalysis?.label) {
      latestLabelByDate.set(key, diary.emotionAnalysis.label)
    }
  }

  const days: PastDay[] = []
  for (let offset = 6; offset >= 1; offset--) {
    const d = new Date(now)
    d.setDate(d.getDate() - offset)
    days.push({
      dayLabel: WEEKDAY_LABELS[d.getDay()],
      emotionLabel: latestLabelByDate.get(toLocalDateKey(d)) ?? null,
    })
  }
  return days
}
