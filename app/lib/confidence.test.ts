import { describe, expect, it } from 'vitest'
import { confidenceToStars } from './confidence'

describe('confidenceToStars', () => {
  it('rounds to the nearest of 5 stars', () => {
    expect(confidenceToStars(0.9)).toBe(5)
    expect(confidenceToStars(0.6)).toBe(3)
  })

  it('clamps to a minimum of 1 star even for very low confidence', () => {
    expect(confidenceToStars(0.01)).toBe(1)
    expect(confidenceToStars(0)).toBe(1)
  })

  it('clamps to a maximum of 5 stars for confidence above 1', () => {
    expect(confidenceToStars(1.4)).toBe(5)
  })
})
