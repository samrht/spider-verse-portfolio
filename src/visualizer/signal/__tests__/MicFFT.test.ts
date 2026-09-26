import { describe, it, expect, vi } from 'vitest'
import { MicFFT, MIC_CONSTRAINTS } from '../MicFFT'
import { createSignal } from '../types'

function fakes(opts: { state?: AudioContextState; level?: number; deny?: boolean } = {}) {
  const track = { stop: vi.fn() }
  const stream = { getTracks: () => [track] } as unknown as MediaStream
  const analyser = { fftSize: 0, smoothingTimeConstant: 0, frequencyBinCount: 512, connect: vi.fn(), getByteFrequencyData: (a: Uint8Array) => a.fill(opts.level ?? 0) }
  const source = { connect: vi.fn(), disconnect: vi.fn() }
  const ctx = {
    sampleRate: 44100, state: opts.state ?? 'running', destination: { dest: true },
    resume: vi.fn(async () => {}),
    createAnalyser: () => analyser,
    createMediaStreamSource: vi.fn(() => source),
  }
  const getUserMedia = vi.fn(async () => { if (opts.deny) throw new DOMException('denied', 'NotAllowedError'); return stream })
  return { ctx: ctx as unknown as AudioContext, analyser, source, track, getUserMedia }
}

describe('MicFFT', () => {
  it('asks for raw audio and wires mic → analyser, never → speakers', async () => {
    const f = fakes()
    const p = new MicFFT({ ctxFactory: () => f.ctx, getUserMedia: f.getUserMedia })
    await p.start()
    expect(f.getUserMedia).toHaveBeenCalledWith(MIC_CONSTRAINTS)
    expect(MIC_CONSTRAINTS).toEqual({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
    expect(f.source.connect).toHaveBeenCalledWith(f.analyser)
    expect(f.source.connect).not.toHaveBeenCalledWith((f.ctx as unknown as { destination: unknown }).destination)
    expect(f.analyser.fftSize).toBe(1024)
  })

  it('tracks level and reports live mode', async () => {
    const f = fakes({ level: 255 })
    const p = new MicFFT({ ctxFactory: () => f.ctx, getUserMedia: f.getUserMedia })
    await p.start()
    const out = createSignal()
    for (let i = 0; i < 60; i++) p.sample(out, 0)
    expect(out.mode).toBe('live')
    expect(out.energy).toBeGreaterThan(0.8)
  })

  it('stop() releases every mic track and disconnects', async () => {
    const f = fakes()
    const p = new MicFFT({ ctxFactory: () => f.ctx, getUserMedia: f.getUserMedia })
    await p.start()
    p.stop()
    expect(f.track.stop).toHaveBeenCalled()
    expect(f.source.disconnect).toHaveBeenCalled()
  })

  it('rejects when permission is denied, without leaving anything open', async () => {
    const f = fakes({ deny: true })
    const p = new MicFFT({ ctxFactory: () => f.ctx, getUserMedia: f.getUserMedia })
    await expect(p.start()).rejects.toThrow()
    expect(f.ctx.createMediaStreamSource).not.toHaveBeenCalled()
    p.stop()
  })

  it('rejects on a context that stays suspended, before prompting', async () => {
    const f = fakes({ state: 'suspended' })
    const p = new MicFFT({ ctxFactory: () => f.ctx, getUserMedia: f.getUserMedia })
    await expect(p.start()).rejects.toThrow(/not running/)
    expect(f.getUserMedia).not.toHaveBeenCalled()
  })
})
