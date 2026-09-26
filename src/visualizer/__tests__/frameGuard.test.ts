import { describe, it, expect } from 'vitest'
import { nextOver, guardStep } from '../frameGuard'

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

describe('guardStep', () => {
  const slow = (g: { over: number; trips: number }, secs: number) => {
    let s = g; let action: string | null = null
    for (let t = 0; t < secs; t += 0.03) { const r = guardStep(s, 0.03); s = r.next; action = r.action ?? action }
    return { s, action }
  }
  it('halves on the first sustained slowdown, degrades on the second, then stops', () => {
    const a = slow({ over: 0, trips: 0 }, 2.1)
    expect(a.action).toBe('halve')
    const b = slow(a.s, 2.1)
    expect(b.action).toBe('degrade')
    const c = slow(b.s, 2.1)
    expect(c.action).toBe(null)
  })
  it('a stall resets instead of counting', () => {
    expect(guardStep({ over: 1.9, trips: 0 }, 3).next.over).toBe(0)
  })
})
