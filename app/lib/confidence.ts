// EmotionRingCard(Lv.N 배지)와 EmotionSummaryCard(별점)가 동일한 5단계 환산식을 각자 갖고
// 있었다 — 여기 하나로 모아 두 곳이 어긋나지 않게 한다.
export function confidenceToStars(confidence: number): number {
  return Math.min(5, Math.max(1, Math.round(confidence * 5)))
}
