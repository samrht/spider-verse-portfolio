import { describe, it, expect, vi } from 'vitest'
import { LiveFFT } from '../LiveFFT'
import { createSignal } from '../types'

// Fake AudioContext: the analyser fills bins from a controllable level.
function fakeCtx(level: { v: number }) {
  const analyser = {
    fftSize: 1024,
    frequencyBinCount: 512,
    smoothingTimeConstant: 0,
    connect: vi.fn(),
    getByteFrequencyData: (arr: Uint8Array) => arr.fill(level.v),
  }
  const source = { connect: vi.fn(), disconnect: vi.fn() }
  const ctx = {
    sampleRate: 44100,
    state: 'running',
    destination: {},
    createAnalyser: () => analyser,
    createMediaElementSource: vi.fn(() => source),
    resume: vi.fn(async () => {}),
  }
  return { ctx: ctx as unknown as AudioContext, analyser, source }
}

describe('LiveFFT', () => {
  it('wires element → analyser → destination once', async () => {
    const level = { v: 0 }
    const { ctx, source, analyser } = fakeCtx(level)
    const el = document.createElement('audio')
    const p = new LiveFFT(el, () => ctx)
    await p.start()
    await p.start()
    expect((ctx.createMediaElementSource as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
    // Source → destination is the element's only path to speakers, so it is
    // wired exactly once (permanently), even across a second start() call.
    const destCalls = (source.connect as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
      (args) => args[0] === ctx.destination,
    )
    expect(destCalls.length).toBe(1)
    expect(source.connect).toHaveBeenCalledWith(analyser)
    // The analyser is a parallel tap only — it must not also feed destination
    // (that would double the audio).
    expect(analyser.connect).not.toHaveBeenCalled()
  })

  it('stop() detaches only the analyser tap, leaving source → destination connected', async () => {
    const level = { v: 0 }
    const { ctx, source, analyser } = fakeCtx(level)
    const p = new LiveFFT(document.createElement('audio'), () => ctx)
    await p.start()
    p.stop()
    expect(source.disconnect).toHaveBeenCalledWith(analyser)
    expect(source.disconnect).not.toHaveBeenCalledWith(ctx.destination)
    expect(source.connect).toHaveBeenCalledWith(ctx.destination)
  })
  it('reports live mode and tracks level', async () => {
    const level = { v: 0 }
    const { ctx } = fakeCtx(level)
    const p = new LiveFFT(document.createElement('audio'), () => ctx)
    await p.start()
    const out = createSignal()
    p.sample(out, 0)
    expect(out.mode).toBe('live')
    expect(out.energy).toBe(0)
    level.v = 255
    for (let i = 0; i < 60; i++) p.sample(out, i / 60)
    expect(out.energy).toBeGreaterThan(0.8)
    expect(out.bass).toBeGreaterThan(0.8)
  })
  it('available() reflects AudioContext support', () => {
    expect(typeof LiveFFT.available()).toBe('boolean')
  })
})
