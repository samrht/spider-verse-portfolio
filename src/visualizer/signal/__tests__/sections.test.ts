import { describe, it, expect } from 'vitest'
import { SectionDetector, classifyEnergy } from '../sections'

describe('classifyEnergy', () => {
  it('buckets by threshold', () => {
    expect(classifyEnergy(0.1)).toBe('low')
    expect(classifyEnergy(0.4)).toBe('mid')
    expect(classifyEnergy(0.65)).toBe('high')
    expect(classifyEnergy(0.9)).toBe('drop')
  })
})

describe('SectionDetector', () => {
  it('starts at section 0 with the first stable energy', () => {
    const s = new SectionDetector({ smoothing: 1 })
    expect(s.push(0.1, 0.1)).toEqual({ index: 0, energy: 'low' })
  })
  it('advances only after the new level holds for holdSeconds', () => {
    const s = new SectionDetector({ holdSeconds: 2, smoothing: 1 })
    for (let i = 0; i < 10; i++) s.push(0.1, 0.5)
    // jump to high; must hold 2s (4 pushes at 0.5s) before it counts
    expect(s.push(0.65, 0.5).index).toBe(0)
    expect(s.push(0.65, 0.5).index).toBe(0)
    expect(s.push(0.65, 0.5).index).toBe(0)
    const r = s.push(0.65, 0.5)
    expect(r).toEqual({ index: 1, energy: 'high' })
  })
  it('does not advance for a blip shorter than holdSeconds', () => {
    const s = new SectionDetector({ holdSeconds: 2, smoothing: 1 })
    for (let i = 0; i < 10; i++) s.push(0.1, 0.5)
    s.push(0.9, 0.5)
    s.push(0.9, 0.5)
    expect(s.push(0.1, 0.5).index).toBe(0)
  })
  it('reset returns to section 0', () => {
    const s = new SectionDetector({ holdSeconds: 0, smoothing: 1 })
    s.push(0.1, 1)
    s.push(0.9, 1)
    expect(s.push(0.9, 1).index).toBe(1)
    s.reset()
    expect(s.push(0.1, 1).index).toBe(0)
  })
})
