import type { AudioSignal, SignalProvider } from './types'
import { BAND_HZ, bandAverage, binRange, smooth } from './bands'
import { OnsetDetector } from './onset'
import { SectionDetector } from './sections'

// Tier A. MediaElementSource → AnalyserNode → destination. One source per
// element for the lifetime of the page (createMediaElementSource throws on
// a second call for the same element), so sources are cached module-wide.

const sources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>()
let sharedCtx: AudioContext | null = null

function defaultCtx(): AudioContext {
  if (!sharedCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    sharedCtx = new Ctor()
  }
  return sharedCtx
}

export class LiveFFT implements SignalProvider {
  readonly mode = 'live' as const
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private bins = new Uint8Array(512)
  private ranges = { bass: [0, 1] as [number, number], mids: [0, 1] as [number, number], highs: [0, 1] as [number, number] }
  private onset = new OnsetDetector()
  private sections = new SectionDetector()
  private lastT = 0
  private sm = { bass: 0, mids: 0, highs: 0, energy: 0 }
  private readonly el: HTMLMediaElement
  private readonly ctxFactory: () => AudioContext

  // No parameter properties: tsconfig has erasableSyntaxOnly.
  constructor(el: HTMLMediaElement, ctxFactory: () => AudioContext = defaultCtx) {
    this.el = el
    this.ctxFactory = ctxFactory
  }

  static available(): boolean {
    return typeof window !== 'undefined' && !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)
  }

  async start(): Promise<void> {
    if (this.analyser) return
    this.ctx = this.ctxFactory()
    let source = sources.get(this.el)
    if (!source) {
      source = this.ctx.createMediaElementSource(this.el)
      sources.set(this.el, source)
    }
    const analyser = this.ctx.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.6
    source.connect(analyser)
    analyser.connect(this.ctx.destination)
    this.analyser = analyser
    this.bins = new Uint8Array(analyser.frequencyBinCount)
    const sr = this.ctx.sampleRate
    this.ranges = {
      bass: binRange(sr, 1024, BAND_HZ.bass[0], BAND_HZ.bass[1]),
      mids: binRange(sr, 1024, BAND_HZ.mids[0], BAND_HZ.mids[1]),
      highs: binRange(sr, 1024, BAND_HZ.highs[0], BAND_HZ.highs[1]),
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {})
  }

  stop(): void {
    // Keep the source (it is bound to the element for life); drop the analyser.
    this.analyser?.disconnect()
    this.analyser = null
    this.sections.reset()
  }

  resetSections(): void {
    this.sections.reset()
  }

  sample(out: AudioSignal, nowSeconds: number): void {
    out.mode = 'live'
    if (!this.analyser) return
    const dt = Math.max(0, Math.min(0.1, nowSeconds - this.lastT))
    this.lastT = nowSeconds
    this.analyser.getByteFrequencyData(this.bins)

    const bass = bandAverage(this.bins, this.ranges.bass[0], this.ranges.bass[1])
    const mids = bandAverage(this.bins, this.ranges.mids[0], this.ranges.mids[1])
    const highs = bandAverage(this.bins, this.ranges.highs[0], this.ranges.highs[1])
    this.sm.bass = smooth(this.sm.bass, bass, 0.6, 0.15)
    this.sm.mids = smooth(this.sm.mids, mids, 0.5, 0.15)
    this.sm.highs = smooth(this.sm.highs, highs, 0.5, 0.2)
    const loud = bass * 0.5 + mids * 0.35 + highs * 0.15
    this.sm.energy = smooth(this.sm.energy, loud, 0.08, 0.04)

    out.bass = this.sm.bass
    out.mids = this.sm.mids
    out.highs = this.sm.highs
    out.energy = this.sm.energy
    out.beat = this.onset.push(this.bins, dt || 1 / 60)
    out.section = this.sections.push(loud, dt || 1 / 60)
  }
}
