import { describe, it, expect } from 'vitest'
import { Procedural } from '../Procedural'
import { createSignal } from '../types'

describe('Procedural', () => {
  it('reports procedural mode and values in 0..1', async () => {
    const p = new Procedural({ bpm: 120 })
    await p.start()
    const out = createSignal()
    for (let t = 0; t < 10; t += 0.1) {
      p.sample(out, t)
      for (const k of ['bass', 'mids', 'highs', 'energy', 'beat'] as const) {
        expect(out[k]).toBeGreaterThanOrEqual(0)
        expect(out[k]).toBeLessThanOrEqual(1)
      }
    }
    expect(out.mode).toBe('procedural')
  })
  it('beat peaks on the bpm grid', () => {
    const p = new Procedural({ bpm: 120 }) // 0.5 s per beat
    const out = createSignal()
    p.sample(out, 1.0)
    const onBeat = out.beat
    p.sample(out, 1.25)
    expect(out.beat).toBeLessThan(onBeat)
  })
  it('changes section roughly every 30 s', () => {
    const p = new Procedural()
    const out = createSignal()
    p.sample(out, 5)
    const first = out.section.index
    p.sample(out, 40)
    expect(out.section.index).toBeGreaterThan(first)
  })
  it('idle mode caps energy at 0.3', () => {
    const p = new Procedural({ idle: true })
    const out = createSignal()
    let max = 0
    for (let t = 0; t < 60; t += 0.05) { p.sample(out, t); max = Math.max(max, out.energy) }
    expect(max).toBeLessThanOrEqual(0.3)
  })
})
