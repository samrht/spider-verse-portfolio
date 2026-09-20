import { describe, it, expect, vi } from 'vitest'
import { LiveFFT } from '../LiveFFT'
import { createSignal } from '../types'

// Fake AudioContext: the analyser fills bins from a controllable level.
function fakeCtx(level: { v: number }, opts: { state?: AudioContextState; resumeTo?: AudioContextState } = {}) {
  const analyser = {
    fftSize: 1024,
    frequencyBinCount: 512,
    smoothingTimeConstant: 0,
    connect: vi.fn(),
    getByteFrequencyData: (arr: Uint8Array) => arr.fill(level.v),
  }
  const source = { connect: vi.fn(), disconnect: vi.fn() }
  const listeners = new Set<() => void>()
  const ctx = {
    sampleRate: 44100,
    state: opts.state ?? 'running',
    destination: {},
    createAnalyser: () => analyser,
    createMediaElementSource: vi.fn(() => source),
    resume: vi.fn(async () => { if (opts.resumeTo) ctx.state = opts.resumeTo }),
    addEventListener: vi.fn((_t: string, h: () => void) => listeners.add(h)),
    removeEventListener: vi.fn((_t: string, h: () => void) => listeners.delete(h)),
    fire: () => listeners.forEach((h) => h()),
  }
  return { ctx: ctx as unknown as AudioContext & { fire: () => void }, analyser, source, listeners }
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

  // R16: a context that stays suspended after resume() must reject start()
  // WITHOUT capturing the element — createMediaElementSource is permanent
  // and would mute the element page-wide.
  it('start() rejects on a context that stays suspended and never captures the element', async () => {
    const { ctx, source } = fakeCtx({ v: 0 }, { state: 'suspended' })
    const el = document.createElement('audio')
    const p = new LiveFFT(el, () => ctx)
    await expect(p.start()).rejects.toThrow(/not running/)
    expect(ctx.resume).toHaveBeenCalled()
    expect(ctx.createMediaElementSource).not.toHaveBeenCalled()
    expect(source.connect).not.toHaveBeenCalled()
    // stop() after a failed start() is a no-op (no analyser tap was made).
    p.stop()
    expect(source.disconnect).not.toHaveBeenCalled()
  })

  it('start() succeeds when resume() flips the context to running', async () => {
    const { ctx, source, analyser } = fakeCtx({ v: 0 }, { state: 'suspended', resumeTo: 'running' })
    const p = new LiveFFT(document.createElement('audio'), () => ctx)
    await expect(p.start()).resolves.toBeUndefined()
    expect(ctx.resume).toHaveBeenCalled()
    expect(ctx.createMediaElementSource).toHaveBeenCalledTimes(1)
    expect(source.connect).toHaveBeenCalledWith(analyser)
    const out = createSignal()
    p.sample(out, 0)
    expect(out.mode).toBe('live')
  })

  it('onStateChange subscribes to statechange and unsubscribes', () => {
    const { ctx, listeners } = fakeCtx({ v: 0 })
    const cb = vi.fn()
    const off = LiveFFT.onStateChange(cb, ctx)
    expect(listeners.size).toBe(1)
    ;(ctx as unknown as { state: string }).state = 'running'
    ctx.fire()
    expect(cb).toHaveBeenCalledWith('running')
    off()
    expect(listeners.size).toBe(0)
    // No shared context in jsdom: a no-op unsubscribe, no throw.
    expect(typeof LiveFFT.onStateChange(cb)).toBe('function')
  })

  // R13: onset/section dt comes from wall-clock time between samples, not
  // from the (250 ms-stepped) playback position.
  it('sample() clocks dt from performance.now, clamped to [1/240, 0.1]', async () => {
    const { ctx } = fakeCtx({ v: 0 })
    const p = new LiveFFT(document.createElement('audio'), () => ctx)
    await p.start()
    const sections = (p as unknown as { sections: { push: (l: number, dt: number) => unknown } }).sections
    const push = vi.spyOn(sections, 'push')
    const now = vi.spyOn(performance, 'now')
    const out = createSignal()
    now.mockReturnValue(1000); p.sample(out, 5)       // first sample: default 1/60
    now.mockReturnValue(1016); p.sample(out, 5)       // same position, 16 ms later
    now.mockReturnValue(1017); p.sample(out, 5.25)    // 1 ms → clamped up
    now.mockReturnValue(2017); p.sample(out, 5.25)    // 1 s → clamped down
    const dts = push.mock.calls.map((c) => c[1])
    expect(dts[0]).toBeCloseTo(1 / 60)
    expect(dts[1]).toBeCloseTo(0.016)
    expect(dts[2]).toBeCloseTo(1 / 240)
    expect(dts[3]).toBeCloseTo(0.1)
    now.mockRestore()
  })
})
