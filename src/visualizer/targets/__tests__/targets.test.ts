import { describe, it, expect } from 'vitest'
import { TARGETS, bakeTarget } from '../index'
import { mulberry32 } from '../rng'

const NAMES = ['sphere', 'cloud', 'web', 'explosion', 'emblem'] as const

describe('targets', () => {
  it.each(NAMES)('%s returns n*3 floats within bounds', (name) => {
    const a = bakeTarget(name, 1000, 7)
    expect(a).toBeInstanceOf(Float32Array)
    expect(a.length).toBe(3000)
    for (let i = 0; i < a.length; i++) {
      expect(Number.isFinite(a[i])).toBe(true)
      expect(Math.abs(a[i])).toBeLessThanOrEqual(2.5)
    }
  })
  it.each(NAMES)('%s is deterministic for the same seed', (name) => {
    expect(bakeTarget(name, 500, 3)).toEqual(bakeTarget(name, 500, 3))
  })
  it('sphere points lie on the unit sphere', () => {
    const a = TARGETS.sphere(200, 1)
    for (let i = 0; i < 200; i++) {
      const r = Math.hypot(a[i * 3], a[i * 3 + 1], a[i * 3 + 2])
      expect(r).toBeCloseTo(1, 5)
    }
  })
  it('explosion is farther out than sphere', () => {
    const s = TARGETS.sphere(200, 1), e = TARGETS.explosion(200, 1)
    let rs = 0, re = 0
    for (let i = 0; i < 200; i++) {
      rs += Math.hypot(s[i * 3], s[i * 3 + 1], s[i * 3 + 2])
      re += Math.hypot(e[i * 3], e[i * 3 + 1], e[i * 3 + 2])
    }
    expect(re / 200).toBeGreaterThan(1.7)
    expect(rs / 200).toBeCloseTo(1, 3)
  })
  it('web is nearly planar', () => {
    const w = TARGETS.web(2000, 1)
    let maxZ = 0
    for (let i = 0; i < 2000; i++) maxZ = Math.max(maxZ, Math.abs(w[i * 3 + 2]))
    expect(maxZ).toBeLessThanOrEqual(0.05)
  })
  it('rng is seeded', () => {
    const a = mulberry32(42), b = mulberry32(42)
    expect(a()).toBe(b())
  })
})
