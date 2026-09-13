import type { AudioSignal, SignalProvider } from './types'
import { classifyEnergy } from './sections'

// Tier C. No audio: a bpm clock, layered sines and value noise. Sections
// cycle every 28–34 s (seeded, so the same song position always looks the
// same). `idle` is the nothing-playing breathing at 30% energy.

const SECTION_CYCLE: Array<'low' | 'mid' | 'high' | 'drop'> = ['low', 'mid', 'high', 'mid', 'drop', 'low']

function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

function valueNoise(t: number): number {
  const i = Math.floor(t)
  const f = t - i
  const u = f * f * (3 - 2 * f)
  return hash(i) * (1 - u) + hash(i + 1) * u
}

export class Procedural implements SignalProvider {
  readonly mode = 'procedural' as const
  private readonly bpm: number
  private readonly idle: boolean

  constructor(opts: { bpm?: number; idle?: boolean } = {}) {
    this.bpm = opts.bpm ?? 120
    this.idle = opts.idle ?? false
  }

  async start(): Promise<void> {}
  stop(): void {}

  sample(out: AudioSignal, t: number): void {
    const beatLen = 60 / this.bpm
    const phase = (t % beatLen) / beatLen
    const beat = Math.pow(1 - phase, 8)

    // section boundaries: cumulative lengths 28–34 s, seeded by index
    let idx = 0
    let acc = 0
    while (true) {
      const len = 28 + hash(idx + 7) * 6
      if (acc + len > t) break
      acc += len
      idx += 1
    }
    const sectionEnergy = SECTION_CYCLE[idx % SECTION_CYCLE.length]
    const target = { low: 0.2, mid: 0.45, high: 0.68, drop: 0.9 }[sectionEnergy]

    const wobble = 0.12 * (valueNoise(t * 0.7) - 0.5)
    const scale = this.idle ? 0.3 : 1
    const energy = Math.min(1, Math.max(0, (target + wobble) * scale))

    out.bass = Math.min(1, energy * (0.55 + 0.45 * Math.abs(Math.sin(t * 2.1))) + beat * 0.3 * scale)
    out.mids = Math.min(1, energy * (0.5 + 0.5 * valueNoise(t * 3.3)))
    out.highs = Math.min(1, energy * (0.4 + 0.6 * Math.abs(Math.sin(t * 7.3 + 1))))
    out.energy = energy
    out.beat = this.idle ? 0 : beat
    out.section = { index: idx, energy: this.idle ? 'low' : classifyEnergy(energy) }
    out.mode = 'procedural'
  }
}
