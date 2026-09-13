import { describe, it, expect } from 'vitest'
import { MorphMachine, targetForSection } from '../morph'

describe('targetForSection', () => {
  it('maps energy to shape', () => {
    expect(targetForSection('low')).toBe('sphere')
    expect(targetForSection('mid')).toBe('web')
    expect(targetForSection('high')).toBe('cloud')
    expect(targetForSection('drop')).toBe('explosion')
  })
})

describe('MorphMachine', () => {
  it('starts idle on sphere', () => {
    const m = new MorphMachine()
    expect(m.from).toBe('sphere')
    expect(m.to).toBe('sphere')
    expect(m.transitioning).toBe(false)
    expect(m.update(0)).toBeNull()
  })

  it('shows emblem for the first 3 s of a track, then the section target', () => {
    const m = new MorphMachine({ dwellS: 0 })
    m.onTrackStart(10)
    const ev = m.update(10)
    expect(ev).toEqual({ type: 'start', from: 'sphere', to: 'emblem' })
    m.onSection(1, 'high', 11)
    expect(m.update(11)).toBeNull() // still inside the emblem window
    m.update(13.5)
    expect(m.to).toBe('cloud')
  })

  it('transitions over 900 ms', () => {
    const m = new MorphMachine({ dwellS: 0, emblemS: 0 })
    m.onSection(1, 'mid', 0)
    m.update(0)
    expect(m.transitioning).toBe(true)
    m.update(0.45)
    expect(m.progress).toBeCloseTo(0.5, 1)
    m.update(0.9)
    expect(m.transitioning).toBe(false)
    expect(m.progress).toBe(1)
    expect(m.from).toBe('web')
  })

  it('respects minimum dwell', () => {
    const m = new MorphMachine({ dwellS: 6, emblemS: 0 })
    m.onSection(1, 'mid', 0)
    m.update(0)
    m.update(1)
    m.onSection(2, 'high', 2)
    expect(m.update(2)).toBeNull()
    expect(m.to).toBe('web')
    expect(m.update(7)).toEqual({ type: 'start', from: 'web', to: 'cloud' })
  })

  it('never re-targets the same shape', () => {
    const m = new MorphMachine({ dwellS: 0, emblemS: 0 })
    m.onSection(1, 'low', 0)
    expect(m.update(0)).toBeNull()
  })

  it('explosion returns to sphere after 4 s regardless of section', () => {
    const m = new MorphMachine({ dwellS: 0, emblemS: 0 })
    m.onSection(1, 'drop', 0)
    m.update(0)
    m.update(1)
    expect(m.to).toBe('explosion')
    expect(m.update(3.9)).toBeNull()
    expect(m.update(4.1)).toEqual({ type: 'start', from: 'explosion', to: 'sphere' })
  })

  it('explosion return overrides pending section even if onSection runs before update', () => {
    const m = new MorphMachine({ dwellS: 0, emblemS: 0 })
    m.onSection(1, 'drop', 0)
    m.update(0)
    m.update(0.9)
    expect(m.to).toBe('explosion')
    // new section arrives at exact time explosion window elapses
    m.onSection(2, 'mid', 4)
    // update at 4.1 should return to sphere, not morph to web
    expect(m.update(4.1)).toEqual({ type: 'start', from: 'explosion', to: 'sphere' })
  })

  it('does nothing when disabled (reduced motion)', () => {
    const m = new MorphMachine({ enabled: false })
    m.onTrackStart(0)
    m.onSection(3, 'drop', 0)
    expect(m.update(0)).toBeNull()
    expect(m.to).toBe('sphere')
  })
})
