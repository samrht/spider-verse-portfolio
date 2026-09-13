import { describe, it, expect } from 'vitest'
import { OnsetDetector } from '../onset'

function frame(level: number): Uint8Array {
  return new Uint8Array(512).fill(level)
}

describe('OnsetDetector', () => {
  it('fires on a sudden jump and decays afterwards', () => {
    const d = new OnsetDetector()
    for (let i = 0; i < 20; i++) d.push(frame(40), 1 / 60)
    const onBeat = d.push(frame(200), 1 / 60)
    expect(onBeat).toBe(1)
    const later = d.push(frame(200), 0.25)
    expect(later).toBeLessThan(onBeat)
    expect(later).toBeGreaterThan(0)
  })
  it('ignores a steady tone', () => {
    const d = new OnsetDetector()
    let max = 0
    for (let i = 0; i < 120; i++) max = Math.max(max, d.push(frame(180), 1 / 60))
    expect(max).toBe(0)
  })
  it('does not fire on a decrease', () => {
    const d = new OnsetDetector()
    for (let i = 0; i < 20; i++) d.push(frame(200), 1 / 60)
    expect(d.push(frame(20), 1 / 60)).toBe(0)
  })
})
