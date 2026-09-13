// Spectral-flux onset detector. Flux = sum of positive bin deltas per
// frame; an onset is flux above (mean + threshold * stddev) of the recent
// history. Output is an envelope: 1.0 on onset, exponential decay after.

export interface OnsetOptions {
  threshold?: number       // stddev multiplier, default 1.5
  decayPerSecond?: number  // envelope decay, default 6 (≈ 0.37 after 1/6 s)
  history?: number         // frames of flux history, default 43 (~0.7 s at 60 fps)
  minFlux?: number         // absolute floor so silence never triggers, default 8
}

export class OnsetDetector {
  private prev: Uint8Array | null = null
  private hist: number[] = []
  private envelope = 0
  private readonly threshold: number
  private readonly decay: number
  private readonly histLen: number
  private readonly minFlux: number

  constructor(opts: OnsetOptions = {}) {
    this.threshold = opts.threshold ?? 1.5
    this.decay = opts.decayPerSecond ?? 6
    this.histLen = opts.history ?? 43
    this.minFlux = opts.minFlux ?? 8
  }

  push(bins: Uint8Array, dtSeconds: number): number {
    this.envelope *= Math.exp(-this.decay * dtSeconds)

    let flux = 0
    if (this.prev) {
      for (let i = 0; i < bins.length; i++) {
        const d = bins[i] - this.prev[i]
        if (d > 0) flux += d
      }
      flux /= bins.length
    }
    this.prev = Uint8Array.from(bins)

    const n = this.hist.length
    if (n >= 8) {
      let mean = 0
      for (const f of this.hist) mean += f
      mean /= n
      let varSum = 0
      for (const f of this.hist) varSum += (f - mean) * (f - mean)
      const std = Math.sqrt(varSum / n)
      if (flux >= this.minFlux && flux > mean + this.threshold * std) this.envelope = 1
    }

    this.hist.push(flux)
    if (this.hist.length > this.histLen) this.hist.shift()
    return this.envelope < 0.01 ? 0 : this.envelope
  }
}
