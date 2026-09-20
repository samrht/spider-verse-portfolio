import type { AudioSignal, SignalProvider } from './types'
import { BAND_HZ, bandAverage, binRange, smooth } from './bands'
import { OnsetDetector } from './onset'
import { SectionDetector } from './sections'

// Tier A. Once an element is routed through a MediaElementSource, that is
// its ONLY path to speakers — so the source connects to destination once,
// permanently, the first time it's created. The analyser is a parallel tap
// on the source (source → analyser, not source → analyser → destination);
// stop() detaches only that tap, so audio keeps playing after stop(). One
// source per element for the lifetime of the page (createMediaElementSource
// throws on a second call for the same element), so sources are cached
// module-wide.

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
  private source: MediaElementAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private bins = new Uint8Array(512)
  private ranges = { bass: [0, 1] as [number, number], mids: [0, 1] as [number, number], highs: [0, 1] as [number, number] }
  private onset = new OnsetDetector()
  private sections = new SectionDetector()
  private lastPerf = 0
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

  // R16: resume the context BEFORE touching the element. createMediaElementSource
  // permanently reroutes the element through this context; if the context can't
  // run (Safari outside transient activation, iOS interruption) doing that
  // would mute the mixtape page-wide. Rejecting here lets useSignal fall
  // through to BeatMap/Procedural with the element's native output intact.
  async start(): Promise<void> {
    if (this.analyser) return
    const ctx = this.ctxFactory()
    await ctx.resume().catch(() => {})
    if (ctx.state !== 'running') throw new Error('AudioContext not running')
    let source = sources.get(this.el)
    if (!source) {
      source = ctx.createMediaElementSource(this.el)
      // Permanent: this is the element's only remaining path to speakers.
      source.connect(ctx.destination)
      sources.set(this.el, source)
    }
    this.source = source
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.6
    source.connect(analyser)
    this.analyser = analyser
    this.bins = new Uint8Array(analyser.frequencyBinCount)
    const sr = ctx.sampleRate
    this.ranges = {
      bass: binRange(sr, 1024, BAND_HZ.bass[0], BAND_HZ.bass[1]),
      mids: binRange(sr, 1024, BAND_HZ.mids[0], BAND_HZ.mids[1]),
      highs: binRange(sr, 1024, BAND_HZ.highs[0], BAND_HZ.highs[1]),
    }
    this.lastPerf = 0
  }

  // Subscribe to the shared context's state changes (R16: useSignal re-runs
  // provider selection when it flips back to 'running'). No-op until the
  // context exists — creating it here, outside a gesture, would only earn a
  // "not allowed to start" warning.
  static onStateChange(cb: (state: AudioContextState) => void, ctx: AudioContext | null = sharedCtx): () => void {
    if (!ctx) return () => {}
    const handler = () => cb(ctx.state)
    ctx.addEventListener('statechange', handler)
    return () => ctx.removeEventListener('statechange', handler)
  }

  stop(): void {
    // Detach only the analyser tap; source → destination stays connected so
    // playback (e.g. navigating away from /mixtape) doesn't go silent.
    if (this.analyser) this.source?.disconnect(this.analyser)
    this.analyser = null
    this.sections.reset()
  }

  sample(out: AudioSignal, _nowSeconds: number): void {
    out.mode = 'live'
    if (!this.analyser) return
    // R13: onset/section timers run on wall-clock dt between samples, not on
    // playback position (which only changes on the 250 ms progress poll).
    const t = performance.now()
    const dt = this.lastPerf ? Math.max(1 / 240, Math.min(0.1, (t - this.lastPerf) / 1000)) : 1 / 60
    this.lastPerf = t
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
    out.beat = this.onset.push(this.bins, dt)
    out.section = this.sections.push(loud, dt)
  }
}
