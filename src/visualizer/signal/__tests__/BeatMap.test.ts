import { describe, it, expect } from 'vitest'
import { BeatMap, type BeatMapFile } from '../BeatMap'
import { createSignal } from '../types'

const map: BeatMapFile = {
  slug: 'test', bpm: 120, durationS: 4,
  beats: [0.5, 1.0, 1.5, 2.0],
  sections: [{ start: 0, energy: 'low' }, { start: 2, energy: 'drop' }],
  bands: { rateHz: 2, data: [[0.1, 0.1, 0.1], [0.2, 0.2, 0.2], [0.3, 0.3, 0.3], [0.4, 0.4, 0.4], [0.9, 0.9, 0.9], [0.9, 0.9, 0.9], [0.9, 0.9, 0.9], [0.9, 0.9, 0.9]] },
}

describe('BeatMap', () => {
  it('reports synced mode and looks up bands by position', () => {
    let pos = 0
    const p = new BeatMap(map, () => pos)
    const out = createSignal()
    p.sample(out, 0)
    expect(out.mode).toBe('synced')
    expect(out.bass).toBeCloseTo(0.1)
    pos = 1.6 // index 3
    p.sample(out, pos)
    expect(out.bass).toBeCloseTo(0.4)
  })
  it('beat is 1 at a beat time and decays after', () => {
    let pos = 0.5
    const p = new BeatMap(map, () => pos)
    const out = createSignal()
    p.sample(out, pos)
    expect(out.beat).toBeCloseTo(1, 1)
    pos = 0.7
    p.sample(out, pos)
    expect(out.beat).toBeLessThan(0.5)
  })
  it('section follows the map', () => {
    let pos = 1
    const p = new BeatMap(map, () => pos)
    const out = createSignal()
    p.sample(out, pos)
    expect(out.section).toEqual({ index: 0, energy: 'low' })
    pos = 2.5
    p.sample(out, pos)
    expect(out.section).toEqual({ index: 1, energy: 'drop' })
  })
  it('clamps before the first sample and after the end', () => {
    let pos = -1
    const p = new BeatMap(map, () => pos)
    const out = createSignal()
    p.sample(out, pos)
    expect(out.bass).toBeCloseTo(0.1)
    pos = 99
    p.sample(out, pos)
    expect(out.bass).toBeCloseTo(0.9)
    expect(out.section.index).toBe(1)
  })
})
