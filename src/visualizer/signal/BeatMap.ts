import type { AudioSignal, SectionEnergy, SignalProvider } from './types'

// Tier B. Pre-baked analysis indexed by playback position. Position comes
// from the local Howl (listen-along) or the Spotify poll.

export interface BeatMapFile {
  slug: string
  spotifyId?: string
  bpm: number
  durationS: number
  beats: number[]
  sections: Array<{ start: number; energy: SectionEnergy }>
  bands: { rateHz: number; data: Array<[number, number, number]> }
}

// Slugs with a committed map. Kept as a static list so `select.ts` can be
// answered synchronously; the JSON itself loads lazily.
export const BEATMAP_SLUGS: readonly string[] = [
  'whats-up-danger', 'sunflower', 'scared-of-the-dark', 'hide', 'invincible',
  'annihilate', 'calling', 'am-i-dreaming', 'link-up',
]

export function hasBeatMap(slug: string): boolean {
  return BEATMAP_SLUGS.includes(slug)
}

const cache = new Map<string, Promise<BeatMapFile | null>>()

export function loadBeatMap(slug: string): Promise<BeatMapFile | null> {
  let p = cache.get(slug)
  if (!p) {
    p = fetch(`/beatmaps/${slug}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<BeatMapFile>) : null))
      .then((m) => (m && Array.isArray(m.beats) && m.bands?.data?.length ? m : null))
      .catch(() => null)
    cache.set(slug, p)
  }
  return p
}

const BEAT_DECAY = 6

export class BeatMap implements SignalProvider {
  readonly mode = 'synced' as const
  private readonly map: BeatMapFile
  private readonly position: () => number

  // No parameter properties: tsconfig has erasableSyntaxOnly.
  constructor(map: BeatMapFile, position: () => number) {
    this.map = map
    this.position = position
  }

  async start(): Promise<void> {}
  stop(): void {}

  sample(out: AudioSignal, _nowSeconds: number): void {
    const t = Math.max(0, this.position())
    const { bands, beats, sections } = this.map

    const i = Math.min(bands.data.length - 1, Math.floor(t * bands.rateHz))
    const [b, m, h] = bands.data[i]
    out.bass = b
    out.mids = m
    out.highs = h
    out.energy = b * 0.5 + m * 0.35 + h * 0.15

    // nearest beat at or before t (binary search; beats are sorted)
    let lo = 0, hi = beats.length - 1, last = -Infinity
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (beats[mid] <= t) { last = beats[mid]; lo = mid + 1 } else hi = mid - 1
    }
    out.beat = last === -Infinity ? 0 : Math.exp(-BEAT_DECAY * (t - last))
    if (out.beat < 0.01) out.beat = 0

    let s = 0
    for (let k = 0; k < sections.length; k++) if (sections[k].start <= t) s = k
    out.section = { index: s, energy: sections[s]?.energy ?? 'low' }
    out.mode = 'synced'
  }
}
