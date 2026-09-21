import { describe, it, expect } from 'vitest'
import { gutterProgress, captionOffset, panelSettle } from '../motion'

describe('motion math', () => {
  it('gutterProgress maps seam position to 0..1', () => {
    expect(gutterProgress(800, 800)).toBe(0)     // seam at viewport bottom
    expect(gutterProgress(400, 800)).toBe(0.5)
    expect(gutterProgress(0, 800)).toBe(1)       // seam at the top
    expect(gutterProgress(-200, 800)).toBe(1)
    expect(gutterProgress(1200, 800)).toBe(0)
  })
  it('captionOffset slides in over [0.2,0.5] and out over [0.85,1]', () => {
    expect(captionOffset(0)).toBe(-120)
    expect(captionOffset(0.35)).toBeCloseTo(-60)
    expect(captionOffset(0.6)).toBe(0)
    expect(captionOffset(0.925)).toBeCloseTo(-60)
    expect(captionOffset(1)).toBe(-120)
  })
  it('panelSettle eases the next panel into place', () => {
    expect(panelSettle(0)).toEqual({ y: 18, rot: -1.5 })
    expect(panelSettle(1)).toEqual({ y: 0, rot: -0 })
  })
})
