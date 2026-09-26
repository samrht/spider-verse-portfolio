import type { AudioSignal, SignalProvider } from './types'
import { AnalyserCore } from './analyserCore'

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

// The one AudioContext the page shares (LiveFFT, MicFFT, clip audio taps).
export function sharedAudioContext(): AudioContext {
  return defaultCtx()
}

// Clip recording (capture/useClipRecorder): tap the element's cached source
// into a MediaStream so a recording carries the same audio the analyser
// hears. Same R16 rule as start(): never create a source unless the shared
// context is running, or the element would be muted page-wide.
export function audioTap(el: HTMLMediaElement | null): { stream: MediaStream; release: () => void } | null {
  const ctx = sharedCtx
  if (!el || !ctx || ctx.state !== 'running') return null
  let source = sources.get(el)
  if (!source) {
    source = ctx.createMediaElementSource(el)
    source.connect(ctx.destination)
    sources.set(el, source)
  }
  const dest = ctx.createMediaStreamDestination()
  source.connect(dest)
  const tapped = source
  return { stream: dest.stream, release: () => tapped.disconnect(dest) }
}

export class LiveFFT implements SignalProvider {
  readonly mode = 'live' as const
  private source: MediaElementAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private readonly core = new AnalyserCore()
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

  // Expose sections for test access (LiveFFT.test.ts spies on sections.push for dt verification).
  get sections() {
    return this.core.sections
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
    this.core.attach(analyser, ctx.sampleRate)
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
    this.core.detach()
  }

  sample(out: AudioSignal, _nowSeconds: number): void {
    this.core.sample(out)
  }
}
