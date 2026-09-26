import { describe, it, expect } from 'vitest'
import { arcToTime } from '../arc'

// Clockwise from 12 o'clock around (50, 50), duration 100 s.
describe('arcToTime', () => {
  it('maps the four compass points', () => {
    expect(arcToTime(50, 0, 50, 50, 100)).toBeCloseTo(0)
    expect(arcToTime(100, 50, 50, 50, 100)).toBeCloseTo(25)
    expect(arcToTime(50, 100, 50, 50, 100)).toBeCloseTo(50)
    expect(arcToTime(0, 50, 50, 50, 100)).toBeCloseTo(75)
  })
  it('returns 0 when duration is unknown', () => {
    expect(arcToTime(100, 50, 50, 50, 0)).toBe(0)
  })
})
