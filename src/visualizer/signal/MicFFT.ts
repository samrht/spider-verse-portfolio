import type { AudioSignal, SignalProvider } from './types'
import { AnalyserCore } from './analyserCore'
import { LiveFFT, sharedAudioContext } from './LiveFFT'

// Mic mode (listen-modes spec §3): room audio → analyser → AnalyserCore.
// The mic source is never connected to the speakers (no feedback), and
// stop() stops every track so the browser's recording indicator goes off.
export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
}

export class MicFFT implements SignalProvider {
  readonly mode = 'live' as const
  private readonly core = new AnalyserCore()
  private readonly ctxFactory: () => AudioContext
  private readonly getMedia: (c: MediaStreamConstraints) => Promise<MediaStream>
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private gen = 0
  private starting: Promise<void> | null = null

  // No parameter properties: tsconfig has erasableSyntaxOnly.
  constructor(opts: { ctxFactory?: () => AudioContext; getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream> } = {}) {
    this.ctxFactory = opts.ctxFactory ?? sharedAudioContext
    this.getMedia = opts.getUserMedia ?? ((c) => navigator.mediaDevices.getUserMedia(c))
  }

  static available(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && LiveFFT.available()
  }

  start(): Promise<void> {
    if (this.analyser) return Promise.resolve()
    if (this.starting) return this.starting
    const gen = this.gen
    this.starting = this.open(gen).finally(() => { this.starting = null })
    return this.starting
  }

  private async open(gen: number): Promise<void> {
    const ctx = this.ctxFactory()
    await ctx.resume().catch(() => {})
    if (ctx.state !== 'running') throw new Error('AudioContext not running')
    const stream = await this.getMedia(MIC_CONSTRAINTS)
    const release = () => stream.getTracks().forEach((t) => t.stop())
    // stop() was called while we waited for permission: don't go live.
    if (gen !== this.gen) { release(); throw new Error('MicFFT stopped before start completed') }
    try {
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.6
      source.connect(analyser)
      this.stream = stream
      this.source = source
      this.analyser = analyser
      this.core.attach(analyser, ctx.sampleRate)
    } catch (e) {
      release()
      this.stream = null
      this.source = null
      this.analyser = null
      throw e
    }
  }

  stop(): void {
    this.gen++
    this.source?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.source = null
    this.analyser = null
    this.core.detach()
  }

  sample(out: AudioSignal, _nowSeconds: number): void {
    this.core.sample(out)
  }
}
