import type { SectionEnergy } from './types'

// Energy-shift section detector. Smooths energy slowly, buckets it, and
// counts a new section only when the bucket changes and holds for
// `holdSeconds`. The offline analyser reuses the same rule so live and
// pre-baked sections agree.

export function classifyEnergy(e: number): SectionEnergy {
  if (e >= 0.8) return 'drop'
  if (e >= 0.55) return 'high'
  if (e >= 0.3) return 'mid'
  return 'low'
}

export interface SectionOptions {
  holdSeconds?: number // default 2
  smoothing?: number   // per-push one-pole coefficient, default 0.05
}

export class SectionDetector {
  private index = 0
  private current: SectionEnergy | null = null
  private candidate: SectionEnergy | null = null
  private candidateFor = 0
  private smoothed = 0
  private readonly hold: number
  private readonly k: number

  constructor(opts: SectionOptions = {}) {
    this.hold = opts.holdSeconds ?? 2
    this.k = opts.smoothing ?? 0.05
  }

  reset(): void {
    this.index = 0
    this.current = null
    this.candidate = null
    this.candidateFor = 0
    this.smoothed = 0
  }

  push(energy: number, dtSeconds: number): { index: number; energy: SectionEnergy } {
    this.smoothed += (energy - this.smoothed) * this.k
    const bucket = classifyEnergy(this.smoothed)

    if (this.current === null) {
      this.current = bucket
      return { index: this.index, energy: this.current }
    }

    if (bucket === this.current) {
      this.candidate = null
      this.candidateFor = 0
    } else if (bucket === this.candidate) {
      this.candidateFor += dtSeconds
      if (this.candidateFor >= this.hold) {
        this.current = bucket
        this.index += 1
        this.candidate = null
        this.candidateFor = 0
      }
    } else {
      this.candidate = bucket
      this.candidateFor = dtSeconds
      if (this.candidateFor >= this.hold) {
        this.current = bucket
        this.index += 1
        this.candidate = null
        this.candidateFor = 0
      }
    }
    return { index: this.index, energy: this.current }
  }
}
