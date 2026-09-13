import { describe, it, expect } from 'vitest'
import { nextOver } from '../frameGuard'

describe('nextOver', () => {
  it('resets on a stall (dt > 0.25s) instead of accumulating', () => {
    expect(nextOver(1.9, 2.0)).toBe(0)
  })

  it('resets on a good frame (dt <= 0.024s)', () => {
    expect(nextOver(0.05, 0.016)).toBe(0)
  })

  it('accumulates on a slow-but-not-stalled frame (0.024s < dt <= 0.25s)', () => {
    expect(nextOver(0, 0.03)).toBeCloseTo(0.03)
    expect(nextOver(0.03, 0.03)).toBeCloseTo(0.06)
  })

  it('reaches >= 2s after ~2s of consecutive 30ms slow frames', () => {
    let over = 0
    for (let i = 0; i < 67; i++) over = nextOver(over, 0.03)
    expect(over).toBeGreaterThanOrEqual(2)
  })
})
