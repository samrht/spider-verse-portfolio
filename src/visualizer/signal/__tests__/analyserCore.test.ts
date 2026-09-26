import { describe, it, expect } from 'vitest'
import { AnalyserCore } from '../analyserCore'
import { createSignal } from '../types'

function fakeAnalyser(level: { v: number }) {
  return {
    fftSize: 1024,
    frequencyBinCount: 512,
    getByteFrequencyData: (arr: Uint8Array) => arr.fill(level.v),
  } as unknown as AnalyserNode
}

describe('AnalyserCore', () => {
  it('reports live mode and leaves levels alone before attach', () => {
    const core = new AnalyserCore()
    const out = createSignal()
    out.energy = 0.3
    core.sample(out)
    expect(out.mode).toBe('live')
    expect(out.energy).toBe(0.3)
    expect(core.attached).toBe(false)
  })

  it('tracks level once attached', () => {
    const level = { v: 255 }
    const core = new AnalyserCore()
    core.attach(fakeAnalyser(level), 44100)
    expect(core.attached).toBe(true)
    const out = createSignal()
    for (let i = 0; i < 60; i++) core.sample(out)
    expect(out.energy).toBeGreaterThan(0.8)
    expect(out.bass).toBeGreaterThan(0.8)
  })

  it('detach stops sampling', () => {
    const level = { v: 255 }
    const core = new AnalyserCore()
    core.attach(fakeAnalyser(level), 44100)
    core.detach()
    expect(core.attached).toBe(false)
    const out = createSignal()
    core.sample(out)
    expect(out.energy).toBe(0)
  })
})
