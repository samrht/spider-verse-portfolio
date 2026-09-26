import type { AudioSignal } from './types'
import { BAND_HZ, bandAverage, binRange, smooth } from './bands'
import { OnsetDetector } from './onset'
import { SectionDetector } from './sections'

// Band / onset / section analysis over any AnalyserNode (listen-modes spec
// §3.1). LiveFFT feeds it the mixtape element; MicFFT feeds it the mic.
export class AnalyserCore {
  private analyser: AnalyserNode | null = null
  private bins = new Uint8Array(512)
  private ranges = { bass: [0, 1] as [number, number], mids: [0, 1] as [number, number], highs: [0, 1] as [number, number] }
  private onset = new OnsetDetector()
  readonly sections = new SectionDetector()
  private lastPerf = 0
  private sm = { bass: 0, mids: 0, highs: 0, energy: 0 }

  get attached(): boolean { return this.analyser !== null }

  attach(analyser: AnalyserNode, sampleRate: number): void {
    this.analyser = analyser
    this.bins = new Uint8Array(analyser.frequencyBinCount)
    const n = analyser.fftSize
    this.ranges = {
      bass: binRange(sampleRate, n, BAND_HZ.bass[0], BAND_HZ.bass[1]),
      mids: binRange(sampleRate, n, BAND_HZ.mids[0], BAND_HZ.mids[1]),
      highs: binRange(sampleRate, n, BAND_HZ.highs[0], BAND_HZ.highs[1]),
    }
    this.lastPerf = 0
  }

  detach(): void {
    this.analyser = null
    this.sections.reset()
  }

  sample(out: AudioSignal): void {
    out.mode = 'live'
    if (!this.analyser) return
    // R13: onset/section timers run on wall-clock dt between samples.
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
