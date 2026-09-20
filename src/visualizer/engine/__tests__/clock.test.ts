import { describe, it, expect } from 'vitest'
import { MonotonicClock } from '../clock'

describe('MonotonicClock', () => {
  it('starts at 0 and accumulates dt', () => {
    const c = new MonotonicClock()
    expect(c.now).toBe(0)
    expect(c.tick(0.016)).toBeCloseTo(0.016)
    expect(c.tick(0.5)).toBeCloseTo(0.516)
    expect(c.now).toBeCloseTo(0.516)
  })

  it('never runs backwards on negative, zero or NaN dt', () => {
    const c = new MonotonicClock()
    c.tick(1)
    expect(c.tick(-5)).toBe(1)
    expect(c.tick(0)).toBe(1)
    expect(c.tick(Number.NaN)).toBe(1)
    expect(c.tick(Number.POSITIVE_INFINITY)).toBe(1)
  })
})
