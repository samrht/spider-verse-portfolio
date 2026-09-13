# Halftone Field Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/mixtape` around a fullscreen GPU particle field of halftone dots that morphs between shapes as the song moves through sections, fed by live FFT, pre-baked beat maps, or a procedural clock, with a public Spotify now-playing feed and a hideable cassette-deck player.

**Architecture:** A `src/visualizer/` module with three layers: a **signal** layer (`AudioSignal` interface + `LiveFFT` / `BeatMap` / `Procedural` providers, selected by a pure table), a **particle engine** (one `THREE.Points` with morph-target attributes blended in a vertex shader, driven by a pure morph state machine), and a **UI** layer (deck, badge, Spotify chip) over the existing `mixtapeStore`/`mixtapeEngine`. Spotify is a Vercel serverless route holding the owner's refresh token; the browser only ever sees track metadata.

**Tech Stack:** Vite 8, React 19, TypeScript 6, Three r184 + @react-three/fiber 9, GSAP 3, Howler 2, Zustand 5, Vitest (added), Node 24 + ffmpeg (offline analysis), Vercel serverless functions.

**Spec:** `docs/superpowers/specs/2026-09-13-halftone-visualizer-design.md`

## Global Constraints

- `/` must stay untouched: everything under `src/visualizer/` is reached only from the lazy `Mixtape` page. Lighthouse desktop on `/` stays ≥ 90.
- Dot count N: 40 000 desktop; 12 000 when `devicePixelRatio >= 2 && navigator.hardwareConcurrency <= 4` or viewport `< 768px`; `?dots=<n>` overrides.
- Bands: bass 20–150 Hz, mids 150–2000 Hz, highs 2000–16000 Hz. FFT size 1024. Beat-map band rate 20 Hz.
- Morph: 900 ms transition, 6 s minimum dwell, explosion auto-returns to sphere after 4 s, emblem for the first 3 s of every track. Section → target: `low→sphere`, `mid→web`, `high→cloud`, `drop→explosion`.
- Badges (exact copy): `LIVE FFT`, `SYNCED`, `PROCEDURAL`, `SPOTIFY OFFLINE`, `▶ listen along`.
- Deck hide: `⌄` button or `H` key; auto-hide 5 s idle while playing; 350 ms GSAP `power3.inOut`; 12 px bottom hover strip when hidden.
- Spotify poll every 3 s, paused while `document.hidden`; route header `Cache-Control: public, s-maxage=3, stale-while-revalidate=10`; errors return HTTP 200 `{ "error": "unavailable" }`.
- Reduced motion (`prefersReducedMotion()` from `src/engine/motion.ts`): no morphs, no beat flash, breathing amplitude halved.
- Existing code style: 2-space, no semicolons, single quotes, `verbatimModuleSyntax` (use `import type`). `noUnusedLocals`/`noUnusedParameters` are on — prefix unused params with `_`.
- Commits: plain messages, **no** `Co-Authored-By` trailer.
- All commands run from the repo root `C:\Users\shoke\Documents\Claude\Projects\SPIDERMAN\spider-verse-portfolio`.

## File map

| Path | Responsibility |
|---|---|
| `vitest.config.ts`, `src/test/setup.ts` | Test runner (jsdom) |
| `src/visualizer/signal/types.ts` | `AudioSignal`, `SignalProvider`, `SectionEnergy`, `createSignal()` |
| `src/visualizer/signal/bands.ts` | FFT bin → band averages, attack/release smoothing |
| `src/visualizer/signal/onset.ts` | Spectral-flux onset detector → `beat` envelope |
| `src/visualizer/signal/sections.ts` | Energy-shift section detector (shared by LiveFFT and the offline script) |
| `src/visualizer/signal/Procedural.ts` | Tier C provider |
| `src/visualizer/signal/select.ts` | Provider selection table (pure) |
| `src/visualizer/signal/LiveFFT.ts` | Tier A provider on the mixtape `<audio>` element |
| `src/visualizer/signal/BeatMap.ts` | Tier B provider + `BeatMapFile` type + loader |
| `src/visualizer/signal/spotifyPoll.ts` | Zustand store polling `/api/now-playing`, interpolates position |
| `src/visualizer/targets/*.ts` | Deterministic point clouds `(n, seed) => Float32Array` |
| `src/visualizer/engine/morph.ts` | Pure morph state machine |
| `src/visualizer/engine/palette.ts` | Universe → 3 RGB colours |
| `src/visualizer/engine/shaders/points.vert`, `points.frag` | Point shaders |
| `src/visualizer/engine/ParticleField.ts` | Three objects, buffers, uniforms, `update()` |
| `src/visualizer/VisualizerCanvas.tsx` | R3F mount, `useFrame`, provider hookup, N selection, WebGL fallback |
| `src/visualizer/useSignal.ts` | React hook: owns the active provider, switches on store changes |
| `src/visualizer/debug/DebugOverlay.tsx` | `?debug` readout |
| `src/visualizer/ui/Deck.tsx`, `Tracklist.tsx`, `ModeBadge.tsx`, `SpotifyChip.tsx` | UI |
| `src/styles/visualizer.css` | Deck/badge/chip styles (tokens from `tokens.css`) |
| `src/pages/Mixtape.tsx` | Rewritten page |
| `src/store/mixtapeStore.ts` | + `deckHidden`, `setDeckHidden`, `playTrackAt(slug, seconds)` |
| `src/engine/mixtapeEngine.ts` | + `getMediaElement()`, `getCurrentSlug()` |
| `src/data/mixtape.ts` | + optional `spotifyId` |
| `scripts/analyse-track.mjs` | MP3 → beat-map JSON |
| `scripts/spotify-auth.mjs` | One-time refresh-token fetch |
| `public/beatmaps/<slug>.json` | Generated maps |
| `api/now-playing.ts` | Vercel function |
| `vercel.json` | `api/` excluded from the SPA rewrite |
| `src/App.tsx` | `/visualizer` redirects to `/mixtape` |

---

### Task 1: Vitest setup, signal types, band averaging

**Files:**
- Create: `vitest.config.ts`, `src/test/setup.ts`, `src/visualizer/signal/types.ts`, `src/visualizer/signal/bands.ts`
- Test: `src/visualizer/signal/__tests__/bands.test.ts`
- Modify: `package.json` (scripts + devDependencies), `tsconfig.app.json` (add `"vitest/globals"` is NOT used — tests import from `vitest` explicitly)

**Interfaces:**
- Produces: `AudioSignal`, `SectionEnergy`, `SignalMode`, `SignalProvider`, `createSignal(): AudioSignal`, `binRange(sampleRate, fftSize, loHz, hiHz): [number, number]`, `bandAverage(bins: Uint8Array, lo: number, hi: number): number` (0..1), `smooth(prev, next, attack, release): number`, `BAND_HZ` constant.

- [ ] **Step 1: Install Vitest + jsdom**

Run: `npm i -D vitest@^3 jsdom@^26 @testing-library/react@^16 @testing-library/jest-dom@^6`

- [ ] **Step 2: Add config and scripts**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.frag', '**/*.vert', '**/*.glsl'],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'api/**/*.test.ts'],
  },
})
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

In `package.json` scripts add `"test": "vitest run"` and `"test:watch": "vitest"`.

- [ ] **Step 3: Write the signal types**

`src/visualizer/signal/types.ts`:
```ts
export type SectionEnergy = 'low' | 'mid' | 'high' | 'drop'
export type SignalMode = 'live' | 'synced' | 'procedural'

export interface AudioSignal {
  bass: number
  mids: number
  highs: number
  energy: number
  beat: number
  section: { index: number; energy: SectionEnergy }
  mode: SignalMode
}

export interface SignalProvider {
  readonly mode: SignalMode
  start(): Promise<void>
  stop(): void
  // Fill `out` in place. `nowSeconds` is playback position when known,
  // else wall-clock seconds since start().
  sample(out: AudioSignal, nowSeconds: number): void
}

export function createSignal(mode: SignalMode = 'procedural'): AudioSignal {
  return {
    bass: 0, mids: 0, highs: 0, energy: 0, beat: 0,
    section: { index: 0, energy: 'low' },
    mode,
  }
}
```

- [ ] **Step 4: Write the failing band tests**

`src/visualizer/signal/__tests__/bands.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { binRange, bandAverage, smooth, BAND_HZ } from '../bands'

describe('binRange', () => {
  it('maps hz to fft bins for 44.1k / 1024', () => {
    // bin width = 44100 / 1024 = 43.07 Hz
    expect(binRange(44100, 1024, 20, 150)).toEqual([0, 3])
    expect(binRange(44100, 1024, 150, 2000)).toEqual([3, 46])
    expect(binRange(44100, 1024, 2000, 16000)).toEqual([46, 371])
  })
  it('never returns an empty range', () => {
    expect(binRange(44100, 1024, 10, 20)).toEqual([0, 1])
  })
})

describe('bandAverage', () => {
  it('returns 0 for silence and 1 for full scale', () => {
    const silent = new Uint8Array(512)
    const loud = new Uint8Array(512).fill(255)
    expect(bandAverage(silent, 0, 10)).toBe(0)
    expect(bandAverage(loud, 0, 10)).toBe(1)
  })
  it('averages only the requested bins', () => {
    const bins = new Uint8Array(512)
    bins[5] = 255
    expect(bandAverage(bins, 5, 6)).toBe(1)
    expect(bandAverage(bins, 0, 5)).toBe(0)
  })
})

describe('smooth', () => {
  it('rises with attack and falls with release', () => {
    expect(smooth(0, 1, 0.5, 0.1)).toBe(0.5)
    expect(smooth(1, 0, 0.5, 0.1)).toBeCloseTo(0.9)
  })
})

describe('BAND_HZ', () => {
  it('matches the spec bands', () => {
    expect(BAND_HZ).toEqual({ bass: [20, 150], mids: [150, 2000], highs: [2000, 16000] })
  })
})
```

- [ ] **Step 5: Run to verify it fails**

Run: `npx vitest run src/visualizer/signal/__tests__/bands.test.ts`
Expected: FAIL — cannot resolve `../bands`.

- [ ] **Step 6: Implement bands.ts**

```ts
// Band math shared by LiveFFT (browser AnalyserNode bins) and the offline
// analyser (scripts/analyse-track.mjs re-implements the same ranges).

export const BAND_HZ = {
  bass: [20, 150],
  mids: [150, 2000],
  highs: [2000, 16000],
} as const

// [lo, hi) bin indices for a frequency range. Always at least one bin wide.
export function binRange(
  sampleRate: number,
  fftSize: number,
  loHz: number,
  hiHz: number,
): [number, number] {
  const binHz = sampleRate / fftSize
  const lo = Math.floor(loHz / binHz)
  const hi = Math.max(lo + 1, Math.floor(hiHz / binHz))
  return [lo, hi]
}

// Mean of byte bins in [lo, hi), normalised to 0..1.
export function bandAverage(bins: Uint8Array, lo: number, hi: number): number {
  const end = Math.min(hi, bins.length)
  if (end <= lo) return 0
  let sum = 0
  for (let i = lo; i < end; i++) sum += bins[i]
  return sum / ((end - lo) * 255)
}

// One-pole smoothing with separate attack (rising) and release (falling)
// coefficients; both 0..1 where 1 = instant.
export function smooth(prev: number, next: number, attack: number, release: number): number {
  const k = next > prev ? attack : release
  return prev + (next - prev) * k
}
```

- [ ] **Step 7: Run to verify it passes**

Run: `npx vitest run src/visualizer/signal/__tests__/bands.test.ts`
Expected: PASS (7 tests). Also run `npm run build` to confirm the new files typecheck.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts src/test/setup.ts src/visualizer/signal/types.ts src/visualizer/signal/bands.ts src/visualizer/signal/__tests__/bands.test.ts package.json package-lock.json
git commit -m "feat(visualizer): vitest setup, AudioSignal types, band averaging"
```

---

### Task 2: Onset detector and section detector

**Files:**
- Create: `src/visualizer/signal/onset.ts`, `src/visualizer/signal/sections.ts`
- Test: `src/visualizer/signal/__tests__/onset.test.ts`, `src/visualizer/signal/__tests__/sections.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 except types.
- Produces: `class OnsetDetector { constructor(opts?: { threshold?: number; decayPerSecond?: number; history?: number }); push(bins: Uint8Array, dtSeconds: number): number /* beat 0..1 */ }`, `class SectionDetector { constructor(opts?: { holdSeconds?: number; smoothing?: number }); push(energy: number, dtSeconds: number): { index: number; energy: SectionEnergy }; reset(): void }`, `classifyEnergy(e: number): SectionEnergy`.

- [ ] **Step 1: Write the failing onset test**

`src/visualizer/signal/__tests__/onset.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { OnsetDetector } from '../onset'

function frame(level: number): Uint8Array {
  return new Uint8Array(512).fill(level)
}

describe('OnsetDetector', () => {
  it('fires on a sudden jump and decays afterwards', () => {
    const d = new OnsetDetector()
    for (let i = 0; i < 20; i++) d.push(frame(40), 1 / 60)
    const onBeat = d.push(frame(200), 1 / 60)
    expect(onBeat).toBe(1)
    const later = d.push(frame(200), 0.25)
    expect(later).toBeLessThan(onBeat)
    expect(later).toBeGreaterThan(0)
  })
  it('ignores a steady tone', () => {
    const d = new OnsetDetector()
    let max = 0
    for (let i = 0; i < 120; i++) max = Math.max(max, d.push(frame(180), 1 / 60))
    expect(max).toBe(0)
  })
  it('does not fire on a decrease', () => {
    const d = new OnsetDetector()
    for (let i = 0; i < 20; i++) d.push(frame(200), 1 / 60)
    expect(d.push(frame(20), 1 / 60)).toBe(0)
  })
})
```

- [ ] **Step 2: Write the failing sections test**

`src/visualizer/signal/__tests__/sections.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { SectionDetector, classifyEnergy } from '../sections'

describe('classifyEnergy', () => {
  it('buckets by threshold', () => {
    expect(classifyEnergy(0.1)).toBe('low')
    expect(classifyEnergy(0.4)).toBe('mid')
    expect(classifyEnergy(0.65)).toBe('high')
    expect(classifyEnergy(0.9)).toBe('drop')
  })
})

describe('SectionDetector', () => {
  it('starts at section 0 with the first stable energy', () => {
    const s = new SectionDetector({ smoothing: 1 })
    expect(s.push(0.1, 0.1)).toEqual({ index: 0, energy: 'low' })
  })
  it('advances only after the new level holds for holdSeconds', () => {
    const s = new SectionDetector({ holdSeconds: 2, smoothing: 1 })
    for (let i = 0; i < 10; i++) s.push(0.1, 0.5)
    // jump to high; must hold 2s (4 pushes at 0.5s) before it counts
    expect(s.push(0.65, 0.5).index).toBe(0)
    expect(s.push(0.65, 0.5).index).toBe(0)
    expect(s.push(0.65, 0.5).index).toBe(0)
    const r = s.push(0.65, 0.5)
    expect(r).toEqual({ index: 1, energy: 'high' })
  })
  it('does not advance for a blip shorter than holdSeconds', () => {
    const s = new SectionDetector({ holdSeconds: 2, smoothing: 1 })
    for (let i = 0; i < 10; i++) s.push(0.1, 0.5)
    s.push(0.9, 0.5)
    s.push(0.9, 0.5)
    expect(s.push(0.1, 0.5).index).toBe(0)
  })
  it('reset returns to section 0', () => {
    const s = new SectionDetector({ holdSeconds: 0, smoothing: 1 })
    s.push(0.1, 1)
    s.push(0.9, 1)
    expect(s.push(0.9, 1).index).toBe(1)
    s.reset()
    expect(s.push(0.1, 1).index).toBe(0)
  })
})
```

- [ ] **Step 3: Run both to verify they fail**

Run: `npx vitest run src/visualizer/signal/__tests__/onset.test.ts src/visualizer/signal/__tests__/sections.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement onset.ts**

```ts
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
```

- [ ] **Step 5: Implement sections.ts**

```ts
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
```

- [ ] **Step 6: Run to verify they pass**

Run: `npx vitest run src/visualizer/signal`
Expected: PASS (all onset + sections + bands tests).

- [ ] **Step 7: Commit**

```bash
git add src/visualizer/signal/onset.ts src/visualizer/signal/sections.ts src/visualizer/signal/__tests__/onset.test.ts src/visualizer/signal/__tests__/sections.test.ts
git commit -m "feat(visualizer): spectral-flux onset and energy-shift section detectors"
```

---

### Task 3: Procedural provider and provider selection

**Files:**
- Create: `src/visualizer/signal/Procedural.ts`, `src/visualizer/signal/select.ts`
- Test: `src/visualizer/signal/__tests__/Procedural.test.ts`, `src/visualizer/signal/__tests__/select.test.ts`

**Interfaces:**
- Consumes: `AudioSignal`, `SignalProvider`, `createSignal` (Task 1); `classifyEnergy` (Task 2).
- Produces: `class Procedural implements SignalProvider { constructor(opts?: { bpm?: number; idle?: boolean }) }`; `type ProviderKind = 'live' | 'beatmap' | 'procedural' | 'idle'`; `selectProvider(input: SelectInput): ProviderKind` where `SelectInput = { localPlaying: boolean; analyserAvailable: boolean; localHasBeatMap: boolean; spotifyPlaying: boolean; spotifyHasBeatMap: boolean }`.

- [ ] **Step 1: Write the failing Procedural test**

`src/visualizer/signal/__tests__/Procedural.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { Procedural } from '../Procedural'
import { createSignal } from '../types'

describe('Procedural', () => {
  it('reports procedural mode and values in 0..1', async () => {
    const p = new Procedural({ bpm: 120 })
    await p.start()
    const out = createSignal()
    for (let t = 0; t < 10; t += 0.1) {
      p.sample(out, t)
      for (const k of ['bass', 'mids', 'highs', 'energy', 'beat'] as const) {
        expect(out[k]).toBeGreaterThanOrEqual(0)
        expect(out[k]).toBeLessThanOrEqual(1)
      }
    }
    expect(out.mode).toBe('procedural')
  })
  it('beat peaks on the bpm grid', () => {
    const p = new Procedural({ bpm: 120 }) // 0.5 s per beat
    const out = createSignal()
    p.sample(out, 1.0)
    const onBeat = out.beat
    p.sample(out, 1.25)
    expect(out.beat).toBeLessThan(onBeat)
  })
  it('changes section roughly every 30 s', () => {
    const p = new Procedural()
    const out = createSignal()
    p.sample(out, 5)
    const first = out.section.index
    p.sample(out, 40)
    expect(out.section.index).toBeGreaterThan(first)
  })
  it('idle mode caps energy at 0.3', () => {
    const p = new Procedural({ idle: true })
    const out = createSignal()
    let max = 0
    for (let t = 0; t < 60; t += 0.05) { p.sample(out, t); max = Math.max(max, out.energy) }
    expect(max).toBeLessThanOrEqual(0.3)
  })
})
```

- [ ] **Step 2: Write the failing select test**

`src/visualizer/signal/__tests__/select.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { selectProvider } from '../select'

const base = {
  localPlaying: false, analyserAvailable: true, localHasBeatMap: false,
  spotifyPlaying: false, spotifyHasBeatMap: false,
}

describe('selectProvider', () => {
  it('prefers live FFT when a local track plays', () => {
    expect(selectProvider({ ...base, localPlaying: true })).toBe('live')
  })
  it('falls to beatmap then procedural when the analyser is unavailable', () => {
    expect(selectProvider({ ...base, localPlaying: true, analyserAvailable: false, localHasBeatMap: true })).toBe('beatmap')
    expect(selectProvider({ ...base, localPlaying: true, analyserAvailable: false })).toBe('procedural')
  })
  it('uses beatmap for a known Spotify track, procedural otherwise', () => {
    expect(selectProvider({ ...base, spotifyPlaying: true, spotifyHasBeatMap: true })).toBe('beatmap')
    expect(selectProvider({ ...base, spotifyPlaying: true })).toBe('procedural')
  })
  it('is idle when nothing plays', () => {
    expect(selectProvider(base)).toBe('idle')
  })
  it('local playback wins over Spotify', () => {
    expect(selectProvider({ ...base, localPlaying: true, spotifyPlaying: true, spotifyHasBeatMap: true })).toBe('live')
  })
})
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx vitest run src/visualizer/signal/__tests__/Procedural.test.ts src/visualizer/signal/__tests__/select.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement Procedural.ts**

```ts
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
```

- [ ] **Step 5: Implement select.ts**

```ts
// Provider selection table from the spec §3. Pure so it is trivially
// tested; `useSignal` feeds it store state and instantiates the winner.

export type ProviderKind = 'live' | 'beatmap' | 'procedural' | 'idle'

export interface SelectInput {
  localPlaying: boolean
  analyserAvailable: boolean
  localHasBeatMap: boolean
  spotifyPlaying: boolean
  spotifyHasBeatMap: boolean
}

export function selectProvider(i: SelectInput): ProviderKind {
  if (i.localPlaying) {
    if (i.analyserAvailable) return 'live'
    return i.localHasBeatMap ? 'beatmap' : 'procedural'
  }
  if (i.spotifyPlaying) return i.spotifyHasBeatMap ? 'beatmap' : 'procedural'
  return 'idle'
}
```

- [ ] **Step 6: Run to verify they pass**

Run: `npx vitest run src/visualizer/signal`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/visualizer/signal/Procedural.ts src/visualizer/signal/select.ts src/visualizer/signal/__tests__/Procedural.test.ts src/visualizer/signal/__tests__/select.test.ts
git commit -m "feat(visualizer): procedural signal provider and provider selection table"
```

---

### Task 4: Morph state machine

**Files:**
- Create: `src/visualizer/engine/morph.ts`
- Test: `src/visualizer/engine/__tests__/morph.test.ts`

**Interfaces:**
- Consumes: `SectionEnergy` (Task 1).
- Produces: `type TargetName = 'sphere' | 'cloud' | 'web' | 'explosion' | 'emblem'`; `targetForSection(e: SectionEnergy): TargetName`; `class MorphMachine { constructor(opts?: MorphOptions); readonly from: TargetName; readonly to: TargetName; readonly progress: number /*0..1*/; readonly transitioning: boolean; onTrackStart(nowS: number): void; onSection(index: number, energy: SectionEnergy, nowS: number): void; update(nowS: number): MorphEvent | null }` where `MorphEvent = { type: 'start'; from: TargetName; to: TargetName }`. `MorphOptions = { transitionMs?: number; dwellS?: number; explosionReturnS?: number; emblemS?: number; enabled?: boolean }`.

- [ ] **Step 1: Write the failing test**

`src/visualizer/engine/__tests__/morph.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { MorphMachine, targetForSection } from '../morph'

describe('targetForSection', () => {
  it('maps energy to shape', () => {
    expect(targetForSection('low')).toBe('sphere')
    expect(targetForSection('mid')).toBe('web')
    expect(targetForSection('high')).toBe('cloud')
    expect(targetForSection('drop')).toBe('explosion')
  })
})

describe('MorphMachine', () => {
  it('starts idle on sphere', () => {
    const m = new MorphMachine()
    expect(m.from).toBe('sphere')
    expect(m.to).toBe('sphere')
    expect(m.transitioning).toBe(false)
    expect(m.update(0)).toBeNull()
  })

  it('shows emblem for the first 3 s of a track, then the section target', () => {
    const m = new MorphMachine({ dwellS: 0 })
    m.onTrackStart(10)
    const ev = m.update(10)
    expect(ev).toEqual({ type: 'start', from: 'sphere', to: 'emblem' })
    m.onSection(1, 'high', 11)
    expect(m.update(11)).toBeNull() // still inside the emblem window
    m.update(13.5)
    expect(m.to).toBe('cloud')
  })

  it('transitions over 900 ms', () => {
    const m = new MorphMachine({ dwellS: 0, emblemS: 0 })
    m.onSection(1, 'mid', 0)
    m.update(0)
    expect(m.transitioning).toBe(true)
    m.update(0.45)
    expect(m.progress).toBeCloseTo(0.5, 1)
    m.update(0.9)
    expect(m.transitioning).toBe(false)
    expect(m.progress).toBe(1)
    expect(m.from).toBe('web')
  })

  it('respects minimum dwell', () => {
    const m = new MorphMachine({ dwellS: 6, emblemS: 0 })
    m.onSection(1, 'mid', 0)
    m.update(0)
    m.update(1)
    m.onSection(2, 'high', 2)
    expect(m.update(2)).toBeNull()
    expect(m.to).toBe('web')
    expect(m.update(7)).toEqual({ type: 'start', from: 'web', to: 'cloud' })
  })

  it('never re-targets the same shape', () => {
    const m = new MorphMachine({ dwellS: 0, emblemS: 0 })
    m.onSection(1, 'low', 0)
    expect(m.update(0)).toBeNull()
  })

  it('explosion returns to sphere after 4 s regardless of section', () => {
    const m = new MorphMachine({ dwellS: 0, emblemS: 0 })
    m.onSection(1, 'drop', 0)
    m.update(0)
    m.update(1)
    expect(m.to).toBe('explosion')
    expect(m.update(3.9)).toBeNull()
    expect(m.update(4.1)).toEqual({ type: 'start', from: 'explosion', to: 'sphere' })
  })

  it('does nothing when disabled (reduced motion)', () => {
    const m = new MorphMachine({ enabled: false })
    m.onTrackStart(0)
    m.onSection(3, 'drop', 0)
    expect(m.update(0)).toBeNull()
    expect(m.to).toBe('sphere')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/visualizer/engine/__tests__/morph.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement morph.ts**

```ts
import type { SectionEnergy } from '../signal/types'

// Pure morph state machine. The engine asks `update(now)` every frame and
// reacts to a returned 'start' event by re-baking target buffers. Time is
// injected so tests are deterministic.

export type TargetName = 'sphere' | 'cloud' | 'web' | 'explosion' | 'emblem'

export interface MorphEvent { type: 'start'; from: TargetName; to: TargetName }

export interface MorphOptions {
  transitionMs?: number   // default 900
  dwellS?: number         // minimum time in a shape, default 6
  explosionReturnS?: number // default 4
  emblemS?: number        // emblem window at track start, default 3
  enabled?: boolean       // false = never morph (reduced motion)
}

export function targetForSection(e: SectionEnergy): TargetName {
  switch (e) {
    case 'low': return 'sphere'
    case 'mid': return 'web'
    case 'high': return 'cloud'
    case 'drop': return 'explosion'
  }
}

export class MorphMachine {
  from: TargetName = 'sphere'
  to: TargetName = 'sphere'
  progress = 1
  transitioning = false

  private readonly transitionS: number
  private readonly dwellS: number
  private readonly explosionReturnS: number
  private readonly emblemS: number
  private readonly enabled: boolean

  private startedAt = -Infinity     // when the current transition began
  private arrivedAt = -Infinity     // when we last settled into `to`
  private pending: TargetName | null = null
  private emblemUntil = -Infinity
  private lastSection = -1

  constructor(opts: MorphOptions = {}) {
    this.transitionS = (opts.transitionMs ?? 900) / 1000
    this.dwellS = opts.dwellS ?? 6
    this.explosionReturnS = opts.explosionReturnS ?? 4
    this.emblemS = opts.emblemS ?? 3
    this.enabled = opts.enabled ?? true
  }

  onTrackStart(nowS: number): void {
    if (!this.enabled) return
    this.lastSection = -1
    if (this.emblemS > 0) {
      this.emblemUntil = nowS + this.emblemS
      this.pending = 'emblem'
      this.arrivedAt = -Infinity // emblem ignores dwell
    }
  }

  onSection(index: number, energy: SectionEnergy, nowS: number): void {
    if (!this.enabled) return
    if (index === this.lastSection) return
    this.lastSection = index
    const target = targetForSection(energy)
    if (nowS < this.emblemUntil) {
      // queue behind the emblem window
      this.pendingAfterEmblem = target
      return
    }
    this.pending = target
  }
  private pendingAfterEmblem: TargetName | null = null

  update(nowS: number): MorphEvent | null {
    if (!this.enabled) return null

    if (this.transitioning) {
      this.progress = Math.min(1, (nowS - this.startedAt) / this.transitionS)
      if (this.progress >= 1) {
        this.transitioning = false
        this.from = this.to
        this.arrivedAt = nowS
      }
      return null
    }

    // emblem window expired → release whatever was queued behind it
    if (this.pendingAfterEmblem && nowS >= this.emblemUntil) {
      this.pending = this.pendingAfterEmblem
      this.pendingAfterEmblem = null
    }

    // explosion always snaps back
    if (this.to === 'explosion' && nowS - this.arrivedAt >= this.explosionReturnS && this.pending === null) {
      this.pending = 'sphere'
    }

    if (this.pending === null) return null
    const next = this.pending
    if (next === this.to) { this.pending = null; return null }
    const dwellOk = next === 'emblem' || nowS - this.arrivedAt >= this.dwellS
    if (!dwellOk) return null

    this.pending = null
    const ev: MorphEvent = { type: 'start', from: this.to, to: next }
    this.from = this.to
    this.to = next
    this.startedAt = nowS
    this.progress = 0
    this.transitioning = true
    return ev
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/visualizer/engine/__tests__/morph.test.ts`
Expected: PASS (8 tests). If the "emblem" test fails on the `update(13.5)` expectation, check that `pendingAfterEmblem` is released before the dwell check — the order in `update` above is the intended one.

- [ ] **Step 5: Commit**

```bash
git add src/visualizer/engine/morph.ts src/visualizer/engine/__tests__/morph.test.ts
git commit -m "feat(visualizer): pure morph state machine with dwell, emblem and explosion-return guards"
```

---

### Task 5: Geometry targets

**Files:**
- Create: `src/visualizer/targets/sphere.ts`, `cloud.ts`, `web.ts`, `explosion.ts`, `emblem.ts`, `index.ts`, `src/visualizer/targets/rng.ts`
- Test: `src/visualizer/targets/__tests__/targets.test.ts`

**Interfaces:**
- Consumes: `TargetName` (Task 4).
- Produces: `type TargetFn = (n: number, seed: number) => Float32Array` (length `n*3`, all coordinates within `[-2.5, 2.5]`); `TARGETS: Record<TargetName, TargetFn>`; `bakeTarget(name: TargetName, n: number, seed: number): Float32Array`; `mulberry32(seed: number): () => number`.

- [ ] **Step 1: Write the failing test**

`src/visualizer/targets/__tests__/targets.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { TARGETS, bakeTarget } from '../index'
import { mulberry32 } from '../rng'

const NAMES = ['sphere', 'cloud', 'web', 'explosion', 'emblem'] as const

describe('targets', () => {
  it.each(NAMES)('%s returns n*3 floats within bounds', (name) => {
    const a = bakeTarget(name, 1000, 7)
    expect(a).toBeInstanceOf(Float32Array)
    expect(a.length).toBe(3000)
    for (let i = 0; i < a.length; i++) {
      expect(Number.isFinite(a[i])).toBe(true)
      expect(Math.abs(a[i])).toBeLessThanOrEqual(2.5)
    }
  })
  it.each(NAMES)('%s is deterministic for the same seed', (name) => {
    expect(bakeTarget(name, 500, 3)).toEqual(bakeTarget(name, 500, 3))
  })
  it('sphere points lie on the unit sphere', () => {
    const a = TARGETS.sphere(200, 1)
    for (let i = 0; i < 200; i++) {
      const r = Math.hypot(a[i * 3], a[i * 3 + 1], a[i * 3 + 2])
      expect(r).toBeCloseTo(1, 5)
    }
  })
  it('explosion is farther out than sphere', () => {
    const s = TARGETS.sphere(200, 1), e = TARGETS.explosion(200, 1)
    let rs = 0, re = 0
    for (let i = 0; i < 200; i++) {
      rs += Math.hypot(s[i * 3], s[i * 3 + 1], s[i * 3 + 2])
      re += Math.hypot(e[i * 3], e[i * 3 + 1], e[i * 3 + 2])
    }
    expect(re / 200).toBeGreaterThan(1.7)
    expect(rs / 200).toBeCloseTo(1, 3)
  })
  it('web is nearly planar', () => {
    const w = TARGETS.web(2000, 1)
    let maxZ = 0
    for (let i = 0; i < 2000; i++) maxZ = Math.max(maxZ, Math.abs(w[i * 3 + 2]))
    expect(maxZ).toBeLessThanOrEqual(0.05)
  })
  it('rng is seeded', () => {
    const a = mulberry32(42), b = mulberry32(42)
    expect(a()).toBe(b())
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/visualizer/targets`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement rng.ts and the five targets**

`src/visualizer/targets/rng.ts`:
```ts
// Small seeded PRNG so every target is reproducible per (n, seed).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
```

`src/visualizer/targets/sphere.ts`:
```ts
// Fibonacci sphere, radius 1. Even coverage with no clumping at the poles.
export function sphere(n: number, _seed: number): Float32Array {
  const out = new Float32Array(n * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const th = golden * i
    out[i * 3] = Math.cos(th) * r
    out[i * 3 + 1] = y
    out[i * 3 + 2] = Math.sin(th) * r
  }
  return out
}
```

`src/visualizer/targets/cloud.ts`:
```ts
import { sphere } from './sphere'
import { mulberry32 } from './rng'

// Sphere pushed in/out by a cheap 3-octave value noise so it reads as a
// lumpy nebula. Radius stays within [0.4, 1.6].
function hash3(x: number, y: number, z: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 13.13) * 43758.5453
  return s - Math.floor(s)
}
function noise3(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z)
  const fx = x - ix, fy = y - iy, fz = z - iz
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const c000 = hash3(ix, iy, iz, seed), c100 = hash3(ix + 1, iy, iz, seed)
  const c010 = hash3(ix, iy + 1, iz, seed), c110 = hash3(ix + 1, iy + 1, iz, seed)
  const c001 = hash3(ix, iy, iz + 1, seed), c101 = hash3(ix + 1, iy, iz + 1, seed)
  const c011 = hash3(ix, iy + 1, iz + 1, seed), c111 = hash3(ix + 1, iy + 1, iz + 1, seed)
  return lerp(
    lerp(lerp(c000, c100, u), lerp(c010, c110, u), v),
    lerp(lerp(c001, c101, u), lerp(c011, c111, u), v),
    w,
  )
}

export function cloud(n: number, seed: number): Float32Array {
  const base = sphere(n, seed)
  const rnd = mulberry32(seed)
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2]
    const f = noise3(x * 2, y * 2, z * 2, seed) * 0.6 + noise3(x * 5, y * 5, z * 5, seed + 1) * 0.3 + noise3(x * 11, y * 11, z * 11, seed + 2) * 0.1
    const r = 0.4 + f * 1.2 + (rnd() - 0.5) * 0.05
    out[i * 3] = x * r
    out[i * 3 + 1] = y * r
    out[i * 3 + 2] = z * r
  }
  return out
}
```

`src/visualizer/targets/web.ts`:
```ts
import { mulberry32 } from './rng'

// Orb web on the z=0 plane: 14 spokes + 9 spiral rings, jitter ±0.02.
// Points are distributed along thread length so rings and spokes read as
// continuous lines rather than beads.
const SPOKES = 14
const RINGS = 9
const RADIUS = 1.4

export function web(n: number, seed: number): Float32Array {
  const rnd = mulberry32(seed)
  const out = new Float32Array(n * 3)
  // thread segments: [ax, ay, bx, by]
  const segs: Array<[number, number, number, number]> = []
  for (let s = 0; s < SPOKES; s++) {
    const a = (s / SPOKES) * Math.PI * 2
    segs.push([0, 0, Math.cos(a) * RADIUS, Math.sin(a) * RADIUS])
  }
  for (let r = 1; r <= RINGS; r++) {
    const rr = (r / RINGS) * RADIUS
    for (let s = 0; s < SPOKES; s++) {
      const a0 = (s / SPOKES) * Math.PI * 2
      const a1 = ((s + 1) / SPOKES) * Math.PI * 2
      // slight sag between spokes like a real web
      const sag = 0.96
      segs.push([Math.cos(a0) * rr, Math.sin(a0) * rr, Math.cos(a1) * rr * sag, Math.sin(a1) * rr * sag])
    }
  }
  const lengths = segs.map(([ax, ay, bx, by]) => Math.hypot(bx - ax, by - ay))
  const total = lengths.reduce((a, b) => a + b, 0)
  let i = 0
  for (let s = 0; s < segs.length && i < n; s++) {
    const count = s === segs.length - 1 ? n - i : Math.round((lengths[s] / total) * n)
    const [ax, ay, bx, by] = segs[s]
    for (let k = 0; k < count && i < n; k++, i++) {
      const t = rnd()
      out[i * 3] = ax + (bx - ax) * t + (rnd() - 0.5) * 0.04
      out[i * 3 + 1] = ay + (by - ay) * t + (rnd() - 0.5) * 0.04
      out[i * 3 + 2] = (rnd() - 0.5) * 0.04
    }
  }
  return out
}
```

`src/visualizer/targets/explosion.ts`:
```ts
import { sphere } from './sphere'
import { mulberry32 } from './rng'

// Sphere blown outward: radius 1.8–2.4 with per-point spread so the
// transition from sphere reads as a burst, not a scale.
export function explosion(n: number, seed: number): Float32Array {
  const base = sphere(n, seed)
  const rnd = mulberry32(seed + 99)
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const r = 1.8 + rnd() * 0.6
    out[i * 3] = base[i * 3] * r
    out[i * 3 + 1] = base[i * 3 + 1] * r
    out[i * 3 + 2] = base[i * 3 + 2] * r
  }
  return out
}
```

`src/visualizer/targets/emblem.ts`:
```ts
import { mulberry32 } from './rng'

// Spider emblem sampled from a polygon outline (the same silhouette as the
// mixtape cover SVG in Mixtape.tsx), scaled to ±1.2, extruded ±0.05.
// Interior fill by rejection sampling against the polygon.
const OUTLINE: Array<[number, number]> = [
  [12, 3], [13.6, 8], [18, 6.2], [15.6, 10.4], [20, 11.5], [15.6, 13.6],
  [18, 17.8], [13.6, 16], [12, 21], [10.4, 16], [6, 17.8], [8.4, 13.6],
  [4, 11.5], [8.4, 10.4], [6, 6.2], [10.4, 8],
]

function inside(x: number, y: number): boolean {
  let hit = false
  for (let i = 0, j = OUTLINE.length - 1; i < OUTLINE.length; j = i++) {
    const [xi, yi] = OUTLINE[i], [xj, yj] = OUTLINE[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

export function emblem(n: number, seed: number): Float32Array {
  const rnd = mulberry32(seed + 7)
  const out = new Float32Array(n * 3)
  let i = 0
  while (i < n) {
    const x = 3 + rnd() * 18, y = 3 + rnd() * 18
    if (!inside(x, y)) continue
    out[i * 3] = ((x - 12) / 9) * 1.2
    out[i * 3 + 1] = -((y - 12) / 9) * 1.2
    out[i * 3 + 2] = (rnd() - 0.5) * 0.1
    i++
  }
  return out
}
```

`src/visualizer/targets/index.ts`:
```ts
import type { TargetName } from '../engine/morph'
import { sphere } from './sphere'
import { cloud } from './cloud'
import { web } from './web'
import { explosion } from './explosion'
import { emblem } from './emblem'

export type TargetFn = (n: number, seed: number) => Float32Array

export const TARGETS: Record<TargetName, TargetFn> = { sphere, cloud, web, explosion, emblem }

const cache = new Map<string, Float32Array>()

// Targets are pure functions of (name, n, seed); memoise so a morph back to
// a shape doesn't recompute 40k points on the main thread.
export function bakeTarget(name: TargetName, n: number, seed: number): Float32Array {
  const key = `${name}:${n}:${seed}`
  let a = cache.get(key)
  if (!a) {
    a = TARGETS[name](n, seed)
    cache.set(key, a)
  }
  return a
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/visualizer/targets`
Expected: PASS (14 tests).

- [ ] **Step 5: Commit**

```bash
git add src/visualizer/targets
git commit -m "feat(visualizer): deterministic sphere/cloud/web/explosion/emblem point targets"
```

---

### Task 6: Particle engine, shaders, canvas, debug overlay — driven by Procedural

**Files:**
- Create: `src/visualizer/engine/palette.ts`, `src/visualizer/engine/shaders/points.vert`, `src/visualizer/engine/shaders/points.frag`, `src/visualizer/engine/ParticleField.ts`, `src/visualizer/VisualizerCanvas.tsx`, `src/visualizer/debug/DebugOverlay.tsx`, `src/visualizer/dotCount.ts`
- Test: `src/visualizer/engine/__tests__/palette.test.ts`, `src/visualizer/__tests__/dotCount.test.ts`
- Modify: `src/pages/Mixtape.tsx` (mount the canvas behind the existing page — the full page rewrite is Task 8)

**Interfaces:**
- Consumes: `AudioSignal`, `createSignal` (T1); `Procedural` (T3); `MorphMachine`, `TargetName` (T4); `bakeTarget` (T5); `useUniverseStore`, `Universe` (existing); `prefersReducedMotion` (existing).
- Produces: `paletteFor(u: Universe): [THREE.Color, THREE.Color, THREE.Color]`; `chooseDotCount(env: { dpr: number; cores: number; width: number; override?: string | null }): number`; `class ParticleField { constructor(n: number, seed: number); readonly points: THREE.Points; setPalette(u: Universe): void; setReducedMotion(v: boolean): void; onTrackStart(nowS: number): void; update(sig: AudioSignal, nowS: number, dt: number): void; halve(): void; dispose(): void; readonly morph: MorphMachine; readonly n: number }`; React component `VisualizerCanvas({ signal: AudioSignal; nowSeconds: () => number; trackKey: string; debug?: boolean })`.

- [ ] **Step 1: Write the failing palette + dotCount tests**

`src/visualizer/engine/__tests__/palette.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { paletteFor } from '../palette'

describe('paletteFor', () => {
  it('returns three colours with the universe primary first', () => {
    const p = paletteFor('earth-1610')
    expect(p).toHaveLength(3)
    expect(p[0].getHexString()).toBe('ff2d2d')
    expect(paletteFor('earth-928')[0].getHexString()).toBe('00d4ff')
  })
})
```

`src/visualizer/__tests__/dotCount.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { chooseDotCount } from '../dotCount'

describe('chooseDotCount', () => {
  it('is 40000 on desktop', () => {
    expect(chooseDotCount({ dpr: 1, cores: 8, width: 1440 })).toBe(40000)
  })
  it('is 12000 on a small or weak device', () => {
    expect(chooseDotCount({ dpr: 3, cores: 4, width: 1440 })).toBe(12000)
    expect(chooseDotCount({ dpr: 1, cores: 8, width: 600 })).toBe(12000)
  })
  it('honours ?dots override within 1000..100000', () => {
    expect(chooseDotCount({ dpr: 1, cores: 8, width: 1440, override: '25000' })).toBe(25000)
    expect(chooseDotCount({ dpr: 1, cores: 8, width: 1440, override: '5' })).toBe(1000)
    expect(chooseDotCount({ dpr: 1, cores: 8, width: 1440, override: 'x' })).toBe(40000)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/visualizer/engine/__tests__/palette.test.ts src/visualizer/__tests__/dotCount.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement palette.ts and dotCount.ts**

`src/visualizer/engine/palette.ts`:
```ts
import * as THREE from 'three'
import type { Universe } from '../../store/universeStore'

// Mirrors --universe-primary / --universe-accent in styles/tokens.css plus
// white for the third slot. Kept as constants (not read from CSS) so the
// engine has no DOM dependency.
const PRIMARY: Record<Universe, string> = {
  'earth-1610': '#ff2d2d',
  'earth-65': '#6ec6f5',
  'earth-138': '#e8d44d',
  'earth-928': '#00d4ff',
}
const ACCENT: Record<Universe, string> = {
  'earth-1610': '#7b2fff',
  'earth-65': '#f5c6d0',
  'earth-138': '#c0392b',
  'earth-928': '#0057ff',
}

export function paletteFor(u: Universe): [THREE.Color, THREE.Color, THREE.Color] {
  return [new THREE.Color(PRIMARY[u]), new THREE.Color(ACCENT[u]), new THREE.Color('#ffffff')]
}
```

`src/visualizer/dotCount.ts`:
```ts
export const DOTS_DESKTOP = 40000
export const DOTS_MOBILE = 12000

export function chooseDotCount(env: {
  dpr: number
  cores: number
  width: number
  override?: string | null
}): number {
  if (env.override) {
    const n = parseInt(env.override, 10)
    if (Number.isFinite(n)) return Math.min(100000, Math.max(1000, n))
  }
  const weak = env.dpr >= 2 && env.cores <= 4
  if (weak || env.width < 768) return DOTS_MOBILE
  return DOTS_DESKTOP
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/visualizer/engine/__tests__/palette.test.ts src/visualizer/__tests__/dotCount.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the shaders**

`src/visualizer/engine/shaders/points.vert`:
```glsl
// Halftone Field vertex shader. Blends two baked targets, adds simplex
// noise scaled by mids, breathes with bass, sizes with highs.
precision highp float;

attribute vec3 aTargetA;
attribute vec3 aTargetB;
attribute float aSeed;

uniform float uMorph;
uniform float uBass;
uniform float uMids;
uniform float uHighs;
uniform float uTime;
uniform float uPointScale;
uniform float uBreath;   // 0.25 normal, 0.125 reduced motion

varying float vSeed;
varying float vDepth;

// Ashima 3D simplex noise (public domain)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
  float t = smoothstep(0.0, 1.0, uMorph);
  vec3 p = mix(aTargetA, aTargetB, t);
  float n = snoise(p * 2.0 + vec3(uTime * 0.4, aSeed * 3.0, 0.0));
  p += normalize(p + 0.0001) * n * uMids * 0.3;
  p *= 1.0 + uBass * uBreath;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPointScale * (1.2 + uHighs * 1.5 + aSeed * 0.6) / max(0.5, -mv.z);
  vSeed = aSeed;
  vDepth = clamp((-mv.z - 2.0) / 5.0, 0.0, 1.0);
}
```

`src/visualizer/engine/shaders/points.frag`:
```glsl
// Hard-edged disc so each point reads as a printed halftone dot.
precision highp float;

uniform vec3 uPalette[3];
uniform float uBeat;

varying float vSeed;
varying float vDepth;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c);
  if (r2 > 0.25) discard;
  int idx = int(floor(vSeed * 2.999));
  vec3 col = idx == 0 ? uPalette[0] : (idx == 1 ? uPalette[1] : uPalette[2]);
  // beat: white core bloom
  float core = 1.0 - smoothstep(0.0, 0.25, r2);
  col = mix(col, vec3(1.0), uBeat * core * 0.8);
  float alpha = mix(0.95, 0.45, vDepth);
  gl_FragColor = vec4(col, alpha);
}
```

- [ ] **Step 6: Implement ParticleField.ts**

```ts
import * as THREE from 'three'
import vert from './shaders/points.vert?raw'
import frag from './shaders/points.frag?raw'
import type { AudioSignal } from '../signal/types'
import type { Universe } from '../../store/universeStore'
import { MorphMachine, type TargetName } from './morph'
import { bakeTarget } from '../targets'
import { paletteFor } from './palette'

// Owns the Three objects for the field. No React, no DOM: VisualizerCanvas
// mounts `points` and calls update() from useFrame. Attributes are baked
// targets; per-frame work is six uniform writes.

const SMOOTH = { attack: 0.5, release: 0.12 }

export class ParticleField {
  readonly points: THREE.Points
  readonly morph: MorphMachine
  n: number
  private readonly seed: number
  private geometry: THREE.BufferGeometry
  private readonly material: THREE.ShaderMaterial
  private readonly u: {
    uMorph: THREE.IUniform<number>
    uBass: THREE.IUniform<number>
    uMids: THREE.IUniform<number>
    uHighs: THREE.IUniform<number>
    uBeat: THREE.IUniform<number>
    uTime: THREE.IUniform<number>
    uPointScale: THREE.IUniform<number>
    uBreath: THREE.IUniform<number>
    uPalette: THREE.IUniform<THREE.Color[]>
  }
  private reduced = false
  private sm = { bass: 0, mids: 0, highs: 0 }

  constructor(n: number, seed = 1, reducedMotion = false) {
    this.n = n
    this.seed = seed
    this.reduced = reducedMotion
    this.morph = new MorphMachine({ enabled: !reducedMotion })
    this.u = {
      uMorph: { value: 1 },
      uBass: { value: 0 },
      uMids: { value: 0 },
      uHighs: { value: 0 },
      uBeat: { value: 0 },
      uTime: { value: 0 },
      uPointScale: { value: 6 },
      uBreath: { value: reducedMotion ? 0.125 : 0.25 },
      uPalette: { value: paletteFor('earth-1610') },
    }
    this.material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: this.u,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.geometry = this.buildGeometry(n)
    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
  }

  private buildGeometry(n: number): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry()
    const sphere = bakeTarget('sphere', n, this.seed)
    const seeds = new Float32Array(n)
    for (let i = 0; i < n; i++) seeds[i] = ((i * 2654435761) >>> 0) / 4294967296
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    g.setAttribute('aTargetA', new THREE.BufferAttribute(Float32Array.from(sphere), 3))
    g.setAttribute('aTargetB', new THREE.BufferAttribute(Float32Array.from(sphere), 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    return g
  }

  setPalette(u: Universe): void {
    this.u.uPalette.value = paletteFor(u)
  }

  setReducedMotion(v: boolean): void {
    this.reduced = v
    this.u.uBreath.value = v ? 0.125 : 0.25
  }

  onTrackStart(nowS: number): void {
    this.morph.onTrackStart(nowS)
  }

  private startMorph(from: TargetName, to: TargetName): void {
    // Freeze the current blended pose as the new A so a mid-transition
    // retarget never snaps.
    const a = this.geometry.getAttribute('aTargetA') as THREE.BufferAttribute
    const b = this.geometry.getAttribute('aTargetB') as THREE.BufferAttribute
    const t = smoothstep(this.u.uMorph.value)
    const arr = a.array as Float32Array
    const brr = b.array as Float32Array
    for (let i = 0; i < arr.length; i++) arr[i] = arr[i] + (brr[i] - arr[i]) * t
    void from
    brr.set(bakeTarget(to, this.n, this.seed))
    a.needsUpdate = true
    b.needsUpdate = true
    this.u.uMorph.value = 0
  }

  update(sig: AudioSignal, nowS: number, dt: number): void {
    this.morph.onSection(sig.section.index, sig.section.energy, nowS)
    const ev = this.morph.update(nowS)
    if (ev) this.startMorph(ev.from, ev.to)
    this.u.uMorph.value = this.morph.progress

    this.sm.bass += (sig.bass - this.sm.bass) * (sig.bass > this.sm.bass ? SMOOTH.attack : SMOOTH.release)
    this.sm.mids += (sig.mids - this.sm.mids) * (sig.mids > this.sm.mids ? SMOOTH.attack : SMOOTH.release)
    this.sm.highs += (sig.highs - this.sm.highs) * (sig.highs > this.sm.highs ? SMOOTH.attack : SMOOTH.release)
    this.u.uBass.value = this.sm.bass
    this.u.uMids.value = this.sm.mids
    this.u.uHighs.value = this.sm.highs
    this.u.uBeat.value = this.reduced ? 0 : sig.beat
    this.u.uTime.value += dt
  }

  // Frame-time guard from spec §7: rebuild at half N, once.
  halve(): void {
    const n = Math.max(1000, Math.floor(this.n / 2))
    const old = this.geometry
    this.n = n
    this.geometry = this.buildGeometry(n)
    this.points.geometry = this.geometry
    old.dispose()
    this.u.uMorph.value = 1
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}

function smoothstep(x: number): number {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}
```

- [ ] **Step 7: Implement VisualizerCanvas.tsx and DebugOverlay.tsx**

`src/visualizer/VisualizerCanvas.tsx`:
```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { AudioSignal } from './signal/types'
import { ParticleField } from './engine/ParticleField'
import { chooseDotCount } from './dotCount'
import { useUniverseStore } from '../store/universeStore'
import { prefersReducedMotion, onReducedMotionChange } from '../engine/motion'
import { DebugOverlay } from './debug/DebugOverlay'

export interface VisualizerCanvasProps {
  signal: AudioSignal          // mutated in place by the active provider
  nowSeconds: () => number     // playback position or wall clock
  trackKey: string             // changes → onTrackStart
  debug?: boolean
  onFallback?: () => void      // WebGL unavailable / shader failed
}

function Field({ signal, nowSeconds, trackKey, debug }: VisualizerCanvasProps) {
  const gl = useThree((s) => s.gl)
  const n = useMemo(
    () =>
      chooseDotCount({
        dpr: window.devicePixelRatio || 1,
        cores: navigator.hardwareConcurrency || 8,
        width: window.innerWidth,
        override: new URLSearchParams(window.location.search).get('dots'),
      }),
    [],
  )
  const field = useMemo(() => new ParticleField(n, 1, prefersReducedMotion()), [n])
  const universe = useUniverseStore((s) => s.activeUniverse)
  const slow = useRef({ over: 0, halved: false })
  const [, force] = useState(0)

  useEffect(() => field.setPalette(universe), [field, universe])
  useEffect(() => onReducedMotionChange((r) => field.setReducedMotion(r)), [field])
  useEffect(() => { field.onTrackStart(nowSeconds()) }, [field, trackKey, nowSeconds])
  useEffect(() => () => field.dispose(), [field])

  useFrame((_, dt) => {
    field.update(signal, nowSeconds(), dt)
    // spec §7: > 24 ms for 2 s → halve N once
    if (!slow.current.halved) {
      slow.current.over = dt > 0.024 ? slow.current.over + dt : 0
      if (slow.current.over >= 2) {
        field.halve()
        slow.current.halved = true
        force((x) => x + 1)
      }
    }
  })

  useEffect(() => {
    // r184 exposes context-loss via the canvas element
    const el = gl.domElement
    const onLost = (e: Event) => e.preventDefault()
    el.addEventListener('webglcontextlost', onLost)
    return () => el.removeEventListener('webglcontextlost', onLost)
  }, [gl])

  return (
    <>
      <primitive object={field.points} />
      {debug && <DebugOverlay field={field} signal={signal} />}
    </>
  )
}

export function VisualizerCanvas(props: VisualizerCanvasProps) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const c = document.createElement('canvas')
    const ok = !!(c.getContext('webgl2') || c.getContext('webgl'))
    if (!ok) { setFailed(true); props.onFallback?.() }
  }, [props])
  if (failed) return null
  return (
    <div className="viz-canvas" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 55, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0) }}
        onError={() => { setFailed(true); props.onFallback?.() }}
      >
        <Field {...props} />
      </Canvas>
    </div>
  )
}
```

`src/visualizer/debug/DebugOverlay.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import type { ParticleField } from '../engine/ParticleField'
import type { AudioSignal } from '../signal/types'

// ?debug readout. Polls at 10 Hz (not per frame) to keep React out of the
// render loop.
export function DebugOverlay({ field, signal }: { field: ParticleField; signal: AudioSignal }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((t) => t + 1), 100)
    return () => window.clearInterval(id)
  }, [])
  const bar = (v: number) => '█'.repeat(Math.round(v * 20)).padEnd(20, '·')
  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      <pre className="viz-debug">
{`mode     ${signal.mode}
bass     ${bar(signal.bass)} ${signal.bass.toFixed(2)}
mids     ${bar(signal.mids)} ${signal.mids.toFixed(2)}
highs    ${bar(signal.highs)} ${signal.highs.toFixed(2)}
energy   ${bar(signal.energy)} ${signal.energy.toFixed(2)}
beat     ${bar(signal.beat)}
section  #${signal.section.index} ${signal.section.energy}
morph    ${field.morph.from} → ${field.morph.to} ${(field.morph.progress * 100).toFixed(0)}%
dots     ${field.n}`}
      </pre>
    </Html>
  )
}
```

- [ ] **Step 8: Add minimal CSS and mount behind the current page**

Create `src/styles/visualizer.css`:
```css
/* Halftone Field: canvas layer + debug readout. Deck/badge styles land in Task 8. */
.viz-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: radial-gradient(ellipse at 50% 55%, #14141c 0%, #07070a 65%);
}
.viz-canvas canvas { display: block; width: 100%; height: 100%; }

.viz-debug {
  position: fixed;
  top: 12px;
  left: 12px;
  margin: 0;
  padding: 8px 10px;
  font: 11px/1.4 'Share Tech Mono', ui-monospace, monospace;
  color: #ddd;
  background: rgba(7, 7, 10, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.18);
  pointer-events: none;
  white-space: pre;
  z-index: 50;
}
```

In `src/pages/Mixtape.tsx`, add a temporary mount so the field is visible behind the existing layout (Task 8 replaces this page wholesale):

```tsx
// at the top, with the other imports
import { useMemo, useRef } from 'react'
import { VisualizerCanvas } from '../visualizer/VisualizerCanvas'
import { Procedural } from '../visualizer/signal/Procedural'
import { createSignal } from '../visualizer/signal/types'
import '../styles/visualizer.css'
```
and inside the component, before `return`:
```tsx
  // Task 6 scaffold: procedural-only drive. Task 7 swaps in useSignal().
  const signal = useMemo(() => createSignal('procedural'), [])
  const provider = useMemo(() => new Procedural(), [])
  const t0 = useRef(performance.now())
  const nowSeconds = useMemo(() => () => (performance.now() - t0.current) / 1000, [])
  useEffect(() => {
    let raf = 0
    const loop = () => { provider.sample(signal, nowSeconds()); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [provider, signal, nowSeconds])
  const debug = new URLSearchParams(window.location.search).has('debug')
```
and as the first child of `<main className="mixtape-page" ...>`:
```tsx
      <VisualizerCanvas signal={signal} nowSeconds={nowSeconds} trackKey={track.slug} debug={debug} />
```
Also give `.mixtape-page` children a stacking context so they sit above the canvas — append to `visualizer.css`:
```css
.mixtape-page > *:not(.viz-canvas) { position: relative; z-index: 1; }
```

- [ ] **Step 9: Manual check**

Run: `npm run dev` then open `http://localhost:5173/mixtape?debug&nointro`.
Expected: a breathing sphere of red/purple/white dots behind the existing mixtape layout; the debug readout shows `mode procedural`, bars moving, `section` advancing after ~30 s and `morph` changing shape (sphere → web → cloud …). Try `?dots=5000` and `?dots=80000`. Check the browser console for shader compile errors — none expected.

Run: `npm run build` — must pass. Run: `npm run lint` — must pass.

- [ ] **Step 10: Commit**

```bash
git add src/visualizer src/styles/visualizer.css src/pages/Mixtape.tsx
git commit -m "feat(visualizer): GPU halftone particle field with morph targets, R3F canvas and ?debug overlay"
```

---

### Task 7: LiveFFT provider, engine accessors, and the `useSignal` hook

**Files:**
- Create: `src/visualizer/signal/LiveFFT.ts`, `src/visualizer/useSignal.ts`
- Modify: `src/engine/mixtapeEngine.ts` (add `getMediaElement`, `getCurrentSlug`), `src/pages/Mixtape.tsx` (replace the Task 6 scaffold with `useSignal`)
- Test: `src/visualizer/signal/__tests__/LiveFFT.test.ts`

**Interfaces:**
- Consumes: `bandAverage`, `binRange`, `smooth`, `BAND_HZ` (T1); `OnsetDetector`, `SectionDetector` (T2); `Procedural` (T3); `selectProvider` (T3); `createSignal` (T1); `useMixtapeStore` (existing).
- Produces: `getMediaElement(): HTMLMediaElement | null`, `getCurrentSlug(): string | null` in `mixtapeEngine`; `class LiveFFT implements SignalProvider { constructor(el: HTMLMediaElement, ctxFactory?: () => AudioContext); static available(): boolean }`; hook `useSignal(): { signal: AudioSignal; nowSeconds: () => number; trackKey: string; kind: ProviderKind }`. Task 9 extends `useSignal` for beat maps and Task 11 for Spotify — the hook is written with those hooks-in-waiting as `null` inputs now.

- [ ] **Step 1: Add the engine accessors**

In `src/engine/mixtapeEngine.ts`, after `getMixtapeDuration`:
```ts
// The visualizer needs the underlying <audio> element to attach a Web Audio
// analyser. `html5: true` Howls keep it at _sounds[0]._node — a private but
// long-stable Howler field. Returns null before the first load.
export function getMediaElement(): HTMLMediaElement | null {
  if (!howl) return null
  const sounds = (howl as unknown as { _sounds?: Array<{ _node?: HTMLMediaElement }> })._sounds
  const node = sounds?.[0]?._node
  return node instanceof HTMLMediaElement ? node : null
}

export function getCurrentSlug(): string | null {
  return currentSlug
}
```

- [ ] **Step 2: Write the failing LiveFFT test**

`src/visualizer/signal/__tests__/LiveFFT.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { LiveFFT } from '../LiveFFT'
import { createSignal } from '../types'

// Fake AudioContext: the analyser fills bins from a controllable level.
function fakeCtx(level: { v: number }) {
  const analyser = {
    fftSize: 1024,
    frequencyBinCount: 512,
    smoothingTimeConstant: 0,
    connect: vi.fn(),
    getByteFrequencyData: (arr: Uint8Array) => arr.fill(level.v),
  }
  const source = { connect: vi.fn() }
  const ctx = {
    sampleRate: 44100,
    state: 'running',
    destination: {},
    createAnalyser: () => analyser,
    createMediaElementSource: vi.fn(() => source),
    resume: vi.fn(async () => {}),
  }
  return { ctx: ctx as unknown as AudioContext, analyser, source }
}

describe('LiveFFT', () => {
  it('wires element → analyser → destination once', async () => {
    const level = { v: 0 }
    const { ctx, source, analyser } = fakeCtx(level)
    const el = document.createElement('audio')
    const p = new LiveFFT(el, () => ctx)
    await p.start()
    await p.start()
    expect((ctx.createMediaElementSource as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
    expect(source.connect).toHaveBeenCalledWith(analyser)
    expect(analyser.connect).toHaveBeenCalledWith(ctx.destination)
  })
  it('reports live mode and tracks level', async () => {
    const level = { v: 0 }
    const { ctx } = fakeCtx(level)
    const p = new LiveFFT(document.createElement('audio'), () => ctx)
    await p.start()
    const out = createSignal()
    p.sample(out, 0)
    expect(out.mode).toBe('live')
    expect(out.energy).toBe(0)
    level.v = 255
    for (let i = 0; i < 60; i++) p.sample(out, i / 60)
    expect(out.energy).toBeGreaterThan(0.8)
    expect(out.bass).toBeGreaterThan(0.8)
  })
  it('available() reflects AudioContext support', () => {
    expect(typeof LiveFFT.available()).toBe('boolean')
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/visualizer/signal/__tests__/LiveFFT.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement LiveFFT.ts**

```ts
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
    const ctx = this.ctxFactory()
    this.ctx = ctx
    let source = sources.get(this.el)
    if (!source) {
      source = ctx.createMediaElementSource(this.el)
      sources.set(this.el, source)
    }
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.6
    source.connect(analyser)
    analyser.connect(ctx.destination)
    this.analyser = analyser
    this.bins = new Uint8Array(analyser.frequencyBinCount)
    const sr = ctx.sampleRate
    this.ranges = {
      bass: binRange(sr, 1024, BAND_HZ.bass[0], BAND_HZ.bass[1]),
      mids: binRange(sr, 1024, BAND_HZ.mids[0], BAND_HZ.mids[1]),
      highs: binRange(sr, 1024, BAND_HZ.highs[0], BAND_HZ.highs[1]),
    }
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
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
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/visualizer/signal/__tests__/LiveFFT.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Write useSignal.ts**

```ts
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMixtapeStore } from '../store/mixtapeStore'
import { getMediaElement } from '../engine/mixtapeEngine'
import { MIXTAPE_TRACKS } from '../data/mixtape'
import { createSignal, type AudioSignal, type SignalProvider } from './signal/types'
import { Procedural } from './signal/Procedural'
import { LiveFFT } from './signal/LiveFFT'
import { selectProvider, type ProviderKind } from './signal/select'

// Owns the active SignalProvider for the page and samples it once per
// animation frame into a single mutable AudioSignal (the canvas reads the
// same object — no React state on the hot path). Beat-map and Spotify
// inputs arrive in Tasks 9 and 11; until then they are constant `null`.

export interface SignalInputs {
  beatMapFor?: (slug: string) => boolean          // T9
  makeBeatMap?: (slug: string, position: () => number) => SignalProvider | null // T9
  spotify?: { playing: boolean; slug: string | null; position: () => number } | null // T11
}

export function useSignal(inputs: SignalInputs = {}) {
  const signal = useMemo(() => createSignal('procedural'), [])
  const isPlaying = useMixtapeStore((s) => s.isPlaying)
  const currentIndex = useMixtapeStore((s) => s.currentIndex)
  const progress = useMixtapeStore((s) => s.progress)
  const slug = MIXTAPE_TRACKS[currentIndex].slug
  const progressRef = useRef(progress)
  progressRef.current = progress

  const spotify = inputs.spotify ?? null
  const kind: ProviderKind = selectProvider({
    localPlaying: isPlaying,
    analyserAvailable: LiveFFT.available() && getMediaElement() !== null,
    localHasBeatMap: inputs.beatMapFor?.(slug) ?? false,
    spotifyPlaying: !!spotify?.playing,
    spotifyHasBeatMap: !!(spotify?.slug && inputs.beatMapFor?.(spotify.slug)),
  })

  const t0 = useRef(performance.now())
  const nowSeconds = useMemo(() => {
    if (kind === 'live' || (kind === 'beatmap' && isPlaying)) return () => progressRef.current
    if (kind === 'beatmap' && spotify) return spotify.position
    return () => (performance.now() - t0.current) / 1000
  }, [kind, isPlaying, spotify])

  const [provider, setProvider] = useState<SignalProvider | null>(null)
  useEffect(() => {
    let p: SignalProvider | null = null
    if (kind === 'live') {
      const el = getMediaElement()
      if (el) p = new LiveFFT(el)
    } else if (kind === 'beatmap') {
      const s = isPlaying ? slug : spotify?.slug ?? slug
      p = inputs.makeBeatMap?.(s, nowSeconds) ?? null
    }
    if (!p) p = new Procedural({ idle: kind === 'idle' })
    let cancelled = false
    p.start().then(() => { if (!cancelled) setProvider(p) })
    return () => { cancelled = true; p?.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, slug, isPlaying, spotify?.slug])

  useEffect(() => {
    if (!provider) return
    let raf = 0
    const loop = () => { provider.sample(signal, nowSeconds()); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [provider, signal, nowSeconds])

  const trackKey = kind === 'live' || (kind === 'beatmap' && isPlaying) ? slug : spotify?.slug ?? 'procedural'
  return { signal, nowSeconds, trackKey, kind }
}
```

- [ ] **Step 7: Swap the Task 6 scaffold in Mixtape.tsx for the hook**

Remove the `Procedural`/`createSignal`/`useRef` scaffold added in Task 6 Step 8 and replace with:
```tsx
import { useSignal } from '../visualizer/useSignal'
// …
  const { signal, nowSeconds, trackKey } = useSignal()
  const debug = new URLSearchParams(window.location.search).has('debug')
// …
      <VisualizerCanvas signal={signal} nowSeconds={nowSeconds} trackKey={trackKey} debug={debug} />
```

- [ ] **Step 8: Manual check**

Run: `npm run dev`, open `/mixtape?debug&nointro`, press play.
Expected: debug shows `mode live`; bars follow the music (bass on kicks); `beat` pulses on drums; after a loud section holds ~2 s, `section` increments and the shape morphs. Pause → `mode procedural` (idle breathing). Switch tracks → emblem flashes for 3 s. Audio must still be audible (analyser is connected to destination). `npm run build` and `npm run lint` pass; `npx vitest run` all green.

- [ ] **Step 9: Commit**

```bash
git add src/engine/mixtapeEngine.ts src/visualizer/signal/LiveFFT.ts src/visualizer/signal/__tests__/LiveFFT.test.ts src/visualizer/useSignal.ts src/pages/Mixtape.tsx
git commit -m "feat(visualizer): live FFT provider on the mixtape audio element and useSignal hook"
```

---

### Task 8: Page rewrite — deck, tracklist, hide/auto-hide, mode badge

**Files:**
- Create: `src/visualizer/ui/Deck.tsx`, `src/visualizer/ui/Tracklist.tsx`, `src/visualizer/ui/ModeBadge.tsx`, `src/visualizer/ui/useDeckHide.ts`
- Modify: `src/pages/Mixtape.tsx` (full rewrite), `src/store/mixtapeStore.ts` (`deckHidden`, `setDeckHidden`), `src/styles/visualizer.css` (deck/badge styles)
- Test: `src/visualizer/ui/__tests__/useDeckHide.test.ts`, `src/visualizer/ui/__tests__/ModeBadge.test.tsx`

**Interfaces:**
- Consumes: `useSignal` (T7); `useMixtapeStore` (existing + new fields); `gsap` (existing dep); `prefersReducedMotion` (existing).
- Produces: `mixtapeStore.deckHidden: boolean`, `setDeckHidden(v: boolean): void`; `useDeckHide(opts: { idleMs?: number }): { hidden: boolean; show(): void; hide(): void; toggle(): void }`; `ModeBadge({ kind, spotifyStatus }: { kind: ProviderKind; spotifyStatus?: 'playing' | 'idle' | 'offline' })` rendering exactly `LIVE FFT` / `SYNCED` / `PROCEDURAL`; `Deck({ onToggleTracklist })`; `Tracklist({ open })`.

- [ ] **Step 1: Store fields**

In `src/store/mixtapeStore.ts` add to `MixtapeState`:
```ts
  deckHidden: boolean
  setDeckHidden: (v: boolean) => void
```
and to the `create` body:
```ts
  deckHidden: false,
  setDeckHidden: (v) => set({ deckHidden: v }),
```
(not persisted — the deck always starts visible).

- [ ] **Step 2: Write the failing hook test**

`src/visualizer/ui/__tests__/useDeckHide.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDeckHide } from '../useDeckHide'
import { useMixtapeStore } from '../../../store/mixtapeStore'

describe('useDeckHide', () => {
  beforeEach(() => { vi.useFakeTimers(); useMixtapeStore.setState({ deckHidden: false, isPlaying: false }) })
  afterEach(() => vi.useRealTimers())

  it('toggle flips store state', () => {
    const { result } = renderHook(() => useDeckHide())
    act(() => result.current.toggle())
    expect(useMixtapeStore.getState().deckHidden).toBe(true)
    act(() => result.current.toggle())
    expect(useMixtapeStore.getState().deckHidden).toBe(false)
  })

  it('H key toggles', () => {
    renderHook(() => useDeckHide())
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' })) })
    expect(useMixtapeStore.getState().deckHidden).toBe(true)
  })

  it('auto-hides after idleMs while playing, not while paused', () => {
    useMixtapeStore.setState({ isPlaying: true })
    renderHook(() => useDeckHide({ idleMs: 5000 }))
    act(() => { vi.advanceTimersByTime(5001) })
    expect(useMixtapeStore.getState().deckHidden).toBe(true)

    useMixtapeStore.setState({ deckHidden: false, isPlaying: false })
    act(() => { vi.advanceTimersByTime(6000) })
    expect(useMixtapeStore.getState().deckHidden).toBe(false)
  })

  it('pointer movement shows the deck and restarts the idle timer', () => {
    useMixtapeStore.setState({ isPlaying: true, deckHidden: true })
    renderHook(() => useDeckHide({ idleMs: 5000 }))
    act(() => { window.dispatchEvent(new Event('pointermove')) }) // jsdom has no PointerEvent
    expect(useMixtapeStore.getState().deckHidden).toBe(false)
    act(() => { vi.advanceTimersByTime(4000) })
    expect(useMixtapeStore.getState().deckHidden).toBe(false)
    act(() => { vi.advanceTimersByTime(1001) })
    expect(useMixtapeStore.getState().deckHidden).toBe(true)
  })
})
```

- [ ] **Step 3: Write the failing badge test**

`src/visualizer/ui/__tests__/ModeBadge.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModeBadge } from '../ModeBadge'

describe('ModeBadge', () => {
  it('renders the exact spec labels', () => {
    const { rerender } = render(<ModeBadge kind="live" />)
    expect(screen.getByText('LIVE FFT')).toBeInTheDocument()
    rerender(<ModeBadge kind="beatmap" />)
    expect(screen.getByText('SYNCED')).toBeInTheDocument()
    rerender(<ModeBadge kind="procedural" />)
    expect(screen.getByText('PROCEDURAL')).toBeInTheDocument()
    rerender(<ModeBadge kind="idle" />)
    expect(screen.getByText('PROCEDURAL')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run to verify they fail**

Run: `npx vitest run src/visualizer/ui`
Expected: FAIL — modules not found.

- [ ] **Step 5: Implement useDeckHide.ts and ModeBadge.tsx**

`src/visualizer/ui/useDeckHide.ts`:
```ts
import { useCallback, useEffect, useRef } from 'react'
import { useMixtapeStore } from '../../store/mixtapeStore'

// Deck visibility: ⌄ / H toggles; auto-hide after `idleMs` with no pointer
// movement while playing; any pointer move, tap or H brings it back.

export function useDeckHide(opts: { idleMs?: number } = {}) {
  const idleMs = opts.idleMs ?? 5000
  const hidden = useMixtapeStore((s) => s.deckHidden)
  const isPlaying = useMixtapeStore((s) => s.isPlaying)
  const set = useMixtapeStore((s) => s.setDeckHidden)
  const timer = useRef<number | null>(null)

  const clear = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null } }
  const arm = useCallback(() => {
    clear()
    if (!useMixtapeStore.getState().isPlaying) return
    timer.current = window.setTimeout(() => set(true), idleMs)
  }, [idleMs, set])

  const show = useCallback(() => { set(false); arm() }, [set, arm])
  const hide = useCallback(() => { set(true); clear() }, [set])
  const toggle = useCallback(() => {
    if (useMixtapeStore.getState().deckHidden) show()
    else hide()
  }, [show, hide])

  useEffect(() => {
    if (isPlaying) arm()
    else clear()
    return clear
  }, [isPlaying, arm])

  useEffect(() => {
    const onMove = () => { if (useMixtapeStore.getState().deckHidden) set(false); arm() }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        const tag = (e.target as HTMLElement | null)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        toggle()
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onMove)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [arm, set, toggle])

  return { hidden, show, hide, toggle }
}
```

`src/visualizer/ui/ModeBadge.tsx`:
```tsx
import type { ProviderKind } from '../signal/select'

const LABEL: Record<ProviderKind, string> = {
  live: 'LIVE FFT',
  beatmap: 'SYNCED',
  procedural: 'PROCEDURAL',
  idle: 'PROCEDURAL',
}

export function ModeBadge({ kind }: { kind: ProviderKind }) {
  return (
    <span className="viz-badge" data-kind={kind} aria-live="polite">
      {LABEL[kind]}
    </span>
  )
}
```

- [ ] **Step 6: Run to verify they pass**

Run: `npx vitest run src/visualizer/ui`
Expected: PASS.

- [ ] **Step 7: Implement Deck.tsx and Tracklist.tsx**

`src/visualizer/ui/Tracklist.tsx`:
```tsx
import { useMixtapeStore } from '../../store/mixtapeStore'
import { MIXTAPE_TRACKS } from '../../data/mixtape'

export function Tracklist({ open }: { open: boolean }) {
  const currentIndex = useMixtapeStore((s) => s.currentIndex)
  const isPlaying = useMixtapeStore((s) => s.isPlaying)
  const select = useMixtapeStore((s) => s.select)
  return (
    <div className={`viz-tracklist ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <ol className="mixtape-tracklist">
        {MIXTAPE_TRACKS.map((t, i) => {
          const active = i === currentIndex
          return (
            <li key={t.slug}>
              <button
                type="button"
                className="mixtape-track-row"
                onClick={() => select(i)}
                aria-current={active}
                tabIndex={open ? 0 : -1}
                data-spider-sense
              >
                <span className="mixtape-track-index">
                  {active && isPlaying ? '♪' : (i + 1).toString().padStart(2, '0')}
                </span>
                <span className="mixtape-track-text">
                  <span className="mixtape-track-title">{t.title}</span>
                  <span className="mixtape-track-artist">{t.artist}</span>
                </span>
                <span className="mixtape-track-tag" data-movie={t.movie}>
                  {t.movie === 'into' ? 'INTO' : 'ACROSS'}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <p className="mixtape-credits">
        All tracks © Sony Pictures Entertainment / respective artists. Personal
        portfolio — not affiliated with Sony, Marvel, or any artist listed. Files
        served for browsing only; if you're a rights holder and want a track
        removed, reach out via the contact details on the home page.
      </p>
    </div>
  )
}
```

`src/visualizer/ui/Deck.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useMixtapeStore } from '../../store/mixtapeStore'
import { MIXTAPE_TRACKS, MOVIE_LABEL } from '../../data/mixtape'
import { prefersReducedMotion } from '../../engine/motion'
import { useDeckHide } from './useDeckHide'
import { Tracklist } from './Tracklist'

// Cassette deck: the mixtape player's face on /mixtape. Reels spin while
// playing; ≡ slides the tracklist up; ⌄ hides the deck (see useDeckHide).

export function Deck() {
  const currentIndex = useMixtapeStore((s) => s.currentIndex)
  const isPlaying = useMixtapeStore((s) => s.isPlaying)
  const progress = useMixtapeStore((s) => s.progress)
  const duration = useMixtapeStore((s) => s.duration)
  const shuffle = useMixtapeStore((s) => s.shuffle)
  const repeat = useMixtapeStore((s) => s.repeat)
  const volume = useMixtapeStore((s) => s.volume)
  const toggle = useMixtapeStore((s) => s.toggle)
  const next = useMixtapeStore((s) => s.next)
  const prev = useMixtapeStore((s) => s.prev)
  const toggleShuffle = useMixtapeStore((s) => s.toggleShuffle)
  const cycleRepeat = useMixtapeStore((s) => s.cycleRepeat)
  const setVolume = useMixtapeStore((s) => s.setVolume)
  const seek = useMixtapeStore((s) => s.seek)
  const { hidden, toggle: toggleHidden, show } = useDeckHide()
  const [listOpen, setListOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (prefersReducedMotion()) {
      gsap.set(el, { y: hidden ? '100%' : '0%' })
      return
    }
    gsap.to(el, { y: hidden ? '100%' : '0%', duration: 0.35, ease: 'power3.inOut', overwrite: true })
  }, [hidden])

  const track = MIXTAPE_TRACKS[currentIndex]
  const pct = duration > 0 ? (progress / duration) * 100 : 0
  const repeatGlyph = repeat === 'one' ? '↻¹' : repeat === 'all' ? '↻' : '⤿'

  return (
    <>
      {hidden && (
        <button type="button" className="viz-deck-reveal" aria-label="Show player" onClick={show} />
      )}
      <div ref={rootRef} className={`viz-deck ${isPlaying ? 'is-playing' : ''}`} aria-label="Mixtape deck">
        <Tracklist open={listOpen} />
        <div className="viz-deck-bar">
          <div className="viz-reels" aria-hidden="true">
            <span className="viz-reel" /><span className="viz-reel" />
          </div>
          <div className="viz-deck-now">
            <p className="mixtape-now-movie">{MOVIE_LABEL[track.movie]}</p>
            <h2 className="viz-deck-title">{track.title}</h2>
            <p className="viz-deck-artist">{track.artist}</p>
          </div>
          <div className="viz-deck-scrub">
            <input
              type="range" min={0} max={duration || 0} step={0.1} value={progress}
              onChange={(e) => seek(parseFloat(e.target.value))}
              aria-label="Track progress"
              style={{ '--mixtape-pct': `${pct}%` } as React.CSSProperties}
            />
            <div className="mixtape-now-time"><span>{fmt(progress)}</span><span>{fmt(duration)}</span></div>
          </div>
          <div className="viz-deck-transport">
            <button type="button" onClick={toggleShuffle} className={`mixtape-control-btn ${shuffle ? 'is-active' : ''}`} aria-label="Toggle shuffle" aria-pressed={shuffle} data-spider-sense>⇌</button>
            <button type="button" onClick={prev} className="mixtape-control-btn" aria-label="Previous track" data-spider-sense>⏮</button>
            <button type="button" onClick={toggle} className="mixtape-control-play" aria-label={isPlaying ? 'Pause' : 'Play'} data-spider-sense>{isPlaying ? '⏸' : '▶'}</button>
            <button type="button" onClick={next} className="mixtape-control-btn" aria-label="Next track" data-spider-sense>⏭</button>
            <button type="button" onClick={cycleRepeat} className={`mixtape-control-btn ${repeat !== 'off' ? 'is-active' : ''}`} aria-label={`Repeat: ${repeat}`} data-spider-sense>{repeatGlyph}</button>
            <label className="mixtape-volume"><span>VOL</span>
              <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} aria-label="Volume" />
            </label>
            <button type="button" onClick={() => setListOpen((o) => !o)} className={`mixtape-control-btn ${listOpen ? 'is-active' : ''}`} aria-label="Toggle tracklist" aria-expanded={listOpen} data-spider-sense>≡</button>
            <button type="button" onClick={toggleHidden} className="mixtape-control-btn" aria-label="Hide player (H)" title="Hide (H)" data-spider-sense>⌄</button>
          </div>
        </div>
      </div>
    </>
  )
}

function fmt(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
```

- [ ] **Step 8: Rewrite Mixtape.tsx**

Replace the file with:
```tsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMixtapeStore } from '../store/mixtapeStore'
import { VisualizerCanvas } from '../visualizer/VisualizerCanvas'
import { useSignal } from '../visualizer/useSignal'
import { Deck } from '../visualizer/ui/Deck'
import { ModeBadge } from '../visualizer/ui/ModeBadge'
import '../styles/mixtape.css'
import '../styles/visualizer.css'

// /mixtape: the Halftone Field visualizer with the cassette deck over it.
// Sets data-universe="earth-1610" on <html> for Miles' palette and restores
// the previous universe on unmount.
export function Mixtape() {
  const { signal, nowSeconds, trackKey, kind } = useSignal()
  const deckHidden = useMixtapeStore((s) => s.deckHidden)
  const debug = new URLSearchParams(window.location.search).has('debug')

  useEffect(() => {
    const root = document.documentElement
    const prev = root.getAttribute('data-universe')
    root.setAttribute('data-universe', 'earth-1610')
    return () => {
      if (prev) root.setAttribute('data-universe', prev)
      else root.removeAttribute('data-universe')
    }
  }, [])

  return (
    <main className={`viz-page ${deckHidden ? 'is-deck-hidden' : ''}`} data-universe="earth-1610">
      <VisualizerCanvas signal={signal} nowSeconds={nowSeconds} trackKey={trackKey} debug={debug} />
      <Link to="/" className="mixtape-page-back viz-back">← BACK TO MOTHERSHIP</Link>
      <div className="viz-topright">
        <ModeBadge kind={kind} />
      </div>
      <Deck />
    </main>
  )
}
```

- [ ] **Step 9: Styles**

Append to `src/styles/visualizer.css` (remove the Task 6 `.mixtape-page > *` rule):
```css
.viz-page { position: relative; min-height: 100vh; overflow: hidden; }
.viz-back { position: fixed; top: 16px; left: 16px; z-index: 5; }
.viz-topright { position: fixed; top: 16px; right: 16px; z-index: 5; display: flex; gap: 8px; align-items: center; }

.viz-badge {
  font: 700 11px/1 'Share Tech Mono', ui-monospace, monospace;
  letter-spacing: 0.1em;
  padding: 5px 8px;
  border-radius: 2px;
  background: var(--universe-primary, #ff2d2d);
  color: #fff;
}
.viz-badge[data-kind='beatmap'] { background: #00d4ff; color: #000; }
.viz-badge[data-kind='procedural'], .viz-badge[data-kind='idle'] { background: rgba(255,255,255,0.14); color: #ddd; }

.viz-deck {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 10;
  background: rgba(10, 10, 14, 0.86);
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(6px);
  will-change: transform;
}
.viz-deck-bar { display: flex; align-items: center; gap: 16px; padding: 10px 16px; }
.viz-reels { display: flex; gap: 8px; }
.viz-reel {
  width: 28px; height: 28px; border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.7);
  border-top-color: var(--universe-primary, #ff2d2d);
}
.viz-deck.is-playing .viz-reel { animation: viz-spin 1.6s linear infinite; }
@keyframes viz-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .viz-deck.is-playing .viz-reel { animation: none; } }
.viz-deck-now { min-width: 160px; }
.viz-deck-title { margin: 0; font-size: 15px; line-height: 1.1; }
.viz-deck-artist { margin: 2px 0 0; opacity: 0.7; font-size: 12px; }
.viz-deck-scrub { flex: 1; min-width: 120px; }
.viz-deck-scrub input[type='range'] { width: 100%; }
.viz-deck-transport { display: flex; align-items: center; gap: 6px; }
.viz-deck-transport .mixtape-volume { margin-left: 8px; }

.viz-tracklist {
  max-height: 0; overflow: hidden;
  transition: max-height 0.35s ease;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.viz-tracklist.is-open { max-height: 50vh; overflow: auto; }

/* 12px hover strip that brings the deck back while hidden */
.viz-deck-reveal {
  position: fixed; left: 0; right: 0; bottom: 0; height: 12px; z-index: 11;
  background: transparent; border: 0; cursor: pointer;
}

@media (max-width: 767px) {
  .viz-deck-bar { flex-wrap: wrap; gap: 8px; padding: 8px 12px; }
  .viz-deck-now { min-width: 0; flex: 1 1 100%; }
  .viz-deck-scrub { flex: 1 1 100%; }
  .viz-deck-transport { flex: 1 1 100%; justify-content: space-between; }
  .viz-deck-transport .mixtape-volume { display: none; }
}
```

- [ ] **Step 10: Manual check**

`npm run dev` → `/mixtape?nointro`. Expected: fullscreen field, deck at the bottom with spinning reels while playing, `≡` opens the tracklist, `⌄` and `H` hide the deck (slides down in 350 ms), it auto-hides after 5 s idle while playing and returns on mouse move; the bottom 12 px strip also reveals it. Badge reads `LIVE FFT` while playing, `PROCEDURAL` when paused. Phone width: deck wraps to three rows. `npm run build`, `npm run lint`, `npx vitest run` all pass.

- [ ] **Step 11: Commit**

```bash
git add src/visualizer/ui src/pages/Mixtape.tsx src/store/mixtapeStore.ts src/styles/visualizer.css
git commit -m "feat(mixtape): cassette deck over the visualizer with tracklist, hide/auto-hide and mode badge"
```

---

### Task 9: Offline beat-map analyser and the BeatMap provider

**Files:**
- Create: `scripts/analyse-track.mjs`, `src/visualizer/signal/BeatMap.ts`, `public/beatmaps/*.json` (generated)
- Modify: `src/visualizer/useSignal.ts` (wire `beatMapFor` / `makeBeatMap` via a small registry), `src/data/mixtape.ts` (optional `spotifyId`), `package.json` (`"beatmaps"` script)
- Test: `src/visualizer/signal/__tests__/BeatMap.test.ts`

**Interfaces:**
- Consumes: `classifyEnergy` + the section rule (T2), `AudioSignal`/`SignalProvider` (T1), `useSignal` inputs (T7).
- Produces: `interface BeatMapFile { slug: string; spotifyId?: string; bpm: number; durationS: number; beats: number[]; sections: Array<{ start: number; energy: SectionEnergy }>; bands: { rateHz: number; data: Array<[number, number, number]> } }`; `class BeatMap implements SignalProvider { constructor(map: BeatMapFile, position: () => number) }`; `loadBeatMap(slug: string): Promise<BeatMapFile | null>` (fetches `/beatmaps/<slug>.json`, caches, null on 404/parse error); `hasBeatMap(slug: string): boolean` (sync, from a build-time list `BEATMAP_SLUGS`).

- [ ] **Step 1: Write the failing BeatMap test**

`src/visualizer/signal/__tests__/BeatMap.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { BeatMap, type BeatMapFile } from '../BeatMap'
import { createSignal } from '../types'

const map: BeatMapFile = {
  slug: 'test', bpm: 120, durationS: 4,
  beats: [0.5, 1.0, 1.5, 2.0],
  sections: [{ start: 0, energy: 'low' }, { start: 2, energy: 'drop' }],
  bands: { rateHz: 2, data: [[0.1, 0.1, 0.1], [0.2, 0.2, 0.2], [0.3, 0.3, 0.3], [0.4, 0.4, 0.4], [0.9, 0.9, 0.9], [0.9, 0.9, 0.9], [0.9, 0.9, 0.9], [0.9, 0.9, 0.9]] },
}

describe('BeatMap', () => {
  it('reports synced mode and looks up bands by position', () => {
    let pos = 0
    const p = new BeatMap(map, () => pos)
    const out = createSignal()
    p.sample(out, 0)
    expect(out.mode).toBe('synced')
    expect(out.bass).toBeCloseTo(0.1)
    pos = 1.6 // index 3
    p.sample(out, pos)
    expect(out.bass).toBeCloseTo(0.4)
  })
  it('beat is 1 at a beat time and decays after', () => {
    let pos = 0.5
    const p = new BeatMap(map, () => pos)
    const out = createSignal()
    p.sample(out, pos)
    expect(out.beat).toBeCloseTo(1, 1)
    pos = 0.7
    p.sample(out, pos)
    expect(out.beat).toBeLessThan(0.5)
  })
  it('section follows the map', () => {
    let pos = 1
    const p = new BeatMap(map, () => pos)
    const out = createSignal()
    p.sample(out, pos)
    expect(out.section).toEqual({ index: 0, energy: 'low' })
    pos = 2.5
    p.sample(out, pos)
    expect(out.section).toEqual({ index: 1, energy: 'drop' })
  })
  it('clamps before the first sample and after the end', () => {
    let pos = -1
    const p = new BeatMap(map, () => pos)
    const out = createSignal()
    p.sample(out, pos)
    expect(out.bass).toBeCloseTo(0.1)
    pos = 99
    p.sample(out, pos)
    expect(out.bass).toBeCloseTo(0.9)
    expect(out.section.index).toBe(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/visualizer/signal/__tests__/BeatMap.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement BeatMap.ts**

```ts
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
  private beatIdx = 0
  private readonly map: BeatMapFile
  private readonly position: () => number

  // No parameter properties: tsconfig has erasableSyntaxOnly.
  constructor(map: BeatMapFile, position: () => number) {
    this.map = map
    this.position = position
  }

  async start(): Promise<void> { this.beatIdx = 0 }
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/visualizer/signal/__tests__/BeatMap.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the offline analyser**

`scripts/analyse-track.mjs`:
```js
#!/usr/bin/env node
// MP3 → beat map JSON. Mirrors src/visualizer/signal: same band ranges,
// same spectral-flux onset rule, same energy-shift section rule.
//
//   node scripts/analyse-track.mjs public/audio/mixtape/sunflower.mp3
//   node scripts/analyse-track.mjs public/audio/mixtape/*.mp3 --out public/beatmaps
//
// Requires ffmpeg on PATH.

import { spawnSync } from 'node:child_process'
import { basename, join } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'

const SR = 22050
const FFT = 2048
const RATE_HZ = 20
const HOP = Math.round(SR / RATE_HZ)
const BAND_HZ = { bass: [20, 150], mids: [150, 2000], highs: [2000, 16000] }

const args = process.argv.slice(2)
const outIdx = args.indexOf('--out')
const outDir = outIdx >= 0 ? args[outIdx + 1] : 'public/beatmaps'
const files = args.filter((a, i) => a !== '--out' && i !== outIdx + 1)
if (files.length === 0) { console.error('usage: analyse-track.mjs <mp3...> [--out dir]'); process.exit(1) }
mkdirSync(outDir, { recursive: true })

for (const file of files) analyse(file)

function decode(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 })
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${file}: ${r.stderr}`)
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4)
}

// In-place iterative radix-2 FFT (re, im arrays of length FFT).
function fft(re, im) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k]
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr
        re[i + k] = ur + vr; im[i + k] = ui + vi
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi
        const ncr = cr * wr - ci * wi
        ci = cr * wi + ci * wr; cr = ncr
      }
    }
  }
}

function binRange(loHz, hiHz) {
  const binHz = SR / FFT
  const lo = Math.floor(loHz / binHz)
  return [lo, Math.max(lo + 1, Math.floor(hiHz / binHz))]
}

function classify(e) {
  if (e >= 0.8) return 'drop'
  if (e >= 0.55) return 'high'
  if (e >= 0.3) return 'mid'
  return 'low'
}

function analyse(file) {
  const slug = basename(file).replace(/\.mp3$/i, '')
  const pcm = decode(file)
  const durationS = pcm.length / SR
  const window = new Float32Array(FFT)
  for (let i = 0; i < FFT; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT - 1))
  const re = new Float32Array(FFT), im = new Float32Array(FFT)
  const ranges = { bass: binRange(...BAND_HZ.bass), mids: binRange(...BAND_HZ.mids), highs: binRange(...BAND_HZ.highs) }

  const frames = []   // [bass, mids, highs] raw magnitudes
  const spectra = []  // per-frame magnitude arrays (for flux)
  for (let start = 0; start + FFT <= pcm.length; start += HOP) {
    for (let i = 0; i < FFT; i++) { re[i] = pcm[start + i] * window[i]; im[i] = 0 }
    fft(re, im)
    const mag = new Float32Array(FFT / 2)
    for (let i = 0; i < FFT / 2; i++) mag[i] = Math.hypot(re[i], im[i])
    spectra.push(mag)
    const avg = ([lo, hi]) => { let s = 0; for (let i = lo; i < hi; i++) s += mag[i]; return s / (hi - lo) }
    frames.push([avg(ranges.bass), avg(ranges.mids), avg(ranges.highs)])
  }

  // Normalise each band to its 98th percentile so quiet masters still fill 0..1.
  const p98 = (k) => { const v = frames.map((f) => f[k]).sort((a, b) => a - b); return v[Math.floor(v.length * 0.98)] || 1 }
  const norm = [p98(0), p98(1), p98(2)]
  const bands = frames.map((f) => f.map((v, k) => +Math.min(1, v / norm[k]).toFixed(3)))

  // Onsets: spectral flux vs rolling mean + 1.5 std, 0.7 s history, 100 ms min gap.
  const flux = spectra.map((m, i) => {
    if (i === 0) return 0
    let s = 0
    for (let k = 0; k < m.length; k++) { const d = m[k] - spectra[i - 1][k]; if (d > 0) s += d }
    return s / m.length
  })
  const beats = []
  const hist = Math.round(0.7 * RATE_HZ)
  let lastBeat = -1
  for (let i = hist; i < flux.length; i++) {
    const win = flux.slice(i - hist, i)
    const mean = win.reduce((a, b) => a + b, 0) / hist
    const std = Math.sqrt(win.reduce((a, b) => a + (b - mean) ** 2, 0) / hist)
    const t = i / RATE_HZ
    if (flux[i] > mean + 1.5 * std && flux[i] > 1e-4 && t - lastBeat >= 0.1) { beats.push(+t.toFixed(3)); lastBeat = t }
  }

  // BPM: autocorrelation of the onset envelope between 60 and 200 bpm.
  const env = new Float32Array(flux.length)
  for (const b of beats) env[Math.round(b * RATE_HZ)] = 1
  let bestBpm = 120, best = -1
  for (let bpm = 60; bpm <= 200; bpm++) {
    const lag = Math.round((60 / bpm) * RATE_HZ)
    let s = 0
    for (let i = lag; i < env.length; i++) s += env[i] * env[i - lag]
    if (s > best) { best = s; bestBpm = bpm }
  }

  // Sections: same rule as SectionDetector (smoothing 0.05/frame at 60fps ≈ 0.15 at 20 Hz, hold 2 s).
  const sections = []
  let smoothed = 0, current = null, candidate = null, candidateFor = 0, index = 0
  const dt = 1 / RATE_HZ
  for (let i = 0; i < bands.length; i++) {
    const [b, m, h] = bands[i]
    const loud = b * 0.5 + m * 0.35 + h * 0.15
    smoothed += (loud - smoothed) * 0.15
    const bucket = classify(smoothed)
    if (current === null) { current = bucket; sections.push({ start: 0, energy: bucket }); continue }
    if (bucket === current) { candidate = null; candidateFor = 0 }
    else if (bucket === candidate) {
      candidateFor += dt
      if (candidateFor >= 2) { current = bucket; index++; sections.push({ start: +((i / RATE_HZ) - 2).toFixed(2), energy: bucket }); candidate = null; candidateFor = 0 }
    } else { candidate = bucket; candidateFor = dt }
  }

  const out = { slug, bpm: bestBpm, durationS: +durationS.toFixed(2), beats, sections, bands: { rateHz: RATE_HZ, data: bands } }
  const dest = join(outDir, `${slug}.json`)
  writeFileSync(dest, JSON.stringify(out))
  console.log(`${slug}: ${durationS.toFixed(0)}s, ${beats.length} beats, ${bestBpm} bpm, ${sections.length} sections → ${dest}`)
}
```

Add to `package.json` scripts: `"beatmaps": "node scripts/analyse-track.mjs public/audio/mixtape/*.mp3 --out public/beatmaps"`.

Note for Windows: the shell won't expand `*.mp3` under `cmd`. Run it from Git Bash or PowerShell as `node scripts/analyse-track.mjs (Get-ChildItem public/audio/mixtape/*.mp3).FullName --out public/beatmaps`.

- [ ] **Step 6: Generate the maps**

Run (Git Bash): `node scripts/analyse-track.mjs public/audio/mixtape/*.mp3 --out public/beatmaps`
Expected: nine lines like `sunflower: 158s, 412 beats, 90 bpm, 7 sections → public/beatmaps/sunflower.json`. Each file is ~60–120 KB. Sanity: `bpm` between 70 and 180; `sections.length` between 3 and 15; no file under 20 KB.

- [ ] **Step 7: Wire into useSignal and add `spotifyId` to the data**

In `src/visualizer/useSignal.ts`, import `{ hasBeatMap, loadBeatMap, BeatMap }` from `./signal/BeatMap` and make the defaults:
```ts
export function useSignal(inputs: SignalInputs = {}) {
  const beatMapFor = inputs.beatMapFor ?? hasBeatMap
  const makeBeatMap = inputs.makeBeatMap ?? null
```
and in the provider effect replace the `beatmap` branch with an async load:
```ts
    } else if (kind === 'beatmap') {
      const s = isPlaying ? slug : spotify?.slug ?? slug
      if (makeBeatMap) p = makeBeatMap(s, nowSeconds)
      else {
        let cancelled = false
        loadBeatMap(s).then((m) => {
          if (cancelled) return
          const prov: SignalProvider = m ? new BeatMap(m, nowSeconds) : new Procedural()
          prov.start().then(() => { if (!cancelled) setProvider(prov) })
        })
        return () => { cancelled = true }
      }
    }
```
(and use `beatMapFor` in the `selectProvider` call instead of `inputs.beatMapFor?.`).

In `src/data/mixtape.ts` add `spotifyId?: string` to `MixtapeTrack` (values are filled in Task 11 once the Spotify IDs are looked up).

- [ ] **Step 8: Manual check**

Temporarily force Tier B: in `src/visualizer/useSignal.ts` set `analyserAvailable:` to `false` (local edit only), open `/mixtape?debug&nointro`, play. Expected: badge `SYNCED`, bars move with the track from the JSON, beats line up with drums within ~50 ms, sections morph at musically sensible points. Revert the local change. Run `npx vitest run`, `npm run build`, `npm run lint`.

- [ ] **Step 9: Commit**

```bash
git add scripts/analyse-track.mjs src/visualizer/signal/BeatMap.ts src/visualizer/signal/__tests__/BeatMap.test.ts src/visualizer/useSignal.ts src/data/mixtape.ts public/beatmaps package.json
git commit -m "feat(visualizer): offline beat-map analyser and synced BeatMap provider for the mixtape tracks"
```

---

### Task 10: Spotify now-playing serverless route and one-time auth script

**Files:**
- Create: `api/now-playing.ts`, `api/_spotify.ts`, `scripts/spotify-auth.mjs`, `api/__tests__/now-playing.test.ts`
- Modify: `vercel.json` (exclude `api/` from the SPA rewrite), `.env.example` (document the three server-side vars), `tsconfig.node.json` (include `api`), `package.json` (`@vercel/node` types)

**Interfaces:**
- Produces: `GET /api/now-playing` → `NowPlaying` JSON: `{ isPlaying: true, spotifyId, track, artist, album, art, progressMs, durationMs, fetchedAt }` | `{ isPlaying: false, lastPlayed: { spotifyId, track, artist, album, art, durationMs } | null, fetchedAt }` | `{ error: 'unavailable' }` (always HTTP 200). Pure helper `buildNowPlaying(current: unknown, recent: unknown, now: number): NowPlaying` and `getAccessToken(env, fetchFn, now): Promise<string>` in `api/_spotify.ts`.

- [ ] **Step 1: Install types and include `api/` in the node tsconfig**

Run: `npm i -D @vercel/node@^5`

In `tsconfig.node.json`, add `"api"` to `include` (it currently lists only `vite.config.ts`). If that file uses `"noEmit": true` keep it; Vercel compiles functions itself.

- [ ] **Step 2: Fix the SPA rewrite**

In `vercel.json` change the rewrite to:
```json
"rewrites": [
  { "source": "/((?!api/).*)", "destination": "/index.html" }
]
```

- [ ] **Step 3: Write the failing tests**

`api/__tests__/now-playing.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { buildNowPlaying, getAccessToken, _resetTokenCache } from '../_spotify'

const item = {
  id: 'abc123', name: 'Sunflower', duration_ms: 158000,
  artists: [{ name: 'Post Malone' }, { name: 'Swae Lee' }],
  album: { name: 'Into the Spider-Verse', images: [{ url: 'https://i/large.jpg', width: 640 }, { url: 'https://i/small.jpg', width: 64 }] },
}

describe('buildNowPlaying', () => {
  it('maps a playing response', () => {
    const r = buildNowPlaying({ is_playing: true, progress_ms: 42000, item }, null, 1000)
    expect(r).toEqual({
      isPlaying: true, spotifyId: 'abc123', track: 'Sunflower', artist: 'Post Malone, Swae Lee',
      album: 'Into the Spider-Verse', art: 'https://i/large.jpg', progressMs: 42000, durationMs: 158000, fetchedAt: 1000,
    })
  })
  it('falls back to recently played when nothing is playing', () => {
    const r = buildNowPlaying(null, { items: [{ track: item }] }, 5)
    expect(r).toEqual({
      isPlaying: false, fetchedAt: 5,
      lastPlayed: { spotifyId: 'abc123', track: 'Sunflower', artist: 'Post Malone, Swae Lee', album: 'Into the Spider-Verse', art: 'https://i/large.jpg', durationMs: 158000 },
    })
  })
  it('treats a paused player as not playing', () => {
    const r = buildNowPlaying({ is_playing: false, progress_ms: 1, item }, null, 5)
    expect(r.isPlaying).toBe(false)
  })
  it('handles no history', () => {
    expect(buildNowPlaying(null, { items: [] }, 5)).toEqual({ isPlaying: false, lastPlayed: null, fetchedAt: 5 })
  })
})

describe('getAccessToken', () => {
  const env = { SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret', SPOTIFY_REFRESH_TOKEN: 'rt' }
  it('exchanges the refresh token and caches until near expiry', async () => {
    _resetTokenCache()
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ access_token: 'AT', expires_in: 3600 }), { status: 200 }))
    expect(await getAccessToken(env, fetchFn as unknown as typeof fetch, 0)).toBe('AT')
    expect(await getAccessToken(env, fetchFn as unknown as typeof fetch, 1000 * 3000)).toBe('AT')
    expect(fetchFn).toHaveBeenCalledTimes(1)
    await getAccessToken(env, fetchFn as unknown as typeof fetch, 1000 * 3560)
    expect(fetchFn).toHaveBeenCalledTimes(2)
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://accounts.spotify.com/api/token')
    expect((init.headers as Record<string, string>).Authorization).toBe('Basic ' + Buffer.from('id:secret').toString('base64'))
  })
  it('throws on a non-200', async () => {
    _resetTokenCache()
    const fetchFn = vi.fn(async () => new Response('nope', { status: 400 }))
    await expect(getAccessToken(env, fetchFn as unknown as typeof fetch, 0)).rejects.toThrow()
  })
})
```

- [ ] **Step 4: Run to verify it fails**

Run: `npx vitest run api`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `api/_spotify.ts`**

```ts
// Pure helpers for the now-playing function. Underscore-prefixed files in
// api/ are not deployed as routes by Vercel.

export interface NowPlayingTrack {
  spotifyId: string
  track: string
  artist: string
  album: string
  art: string | null
  durationMs: number
}
export type NowPlaying =
  | (NowPlayingTrack & { isPlaying: true; progressMs: number; fetchedAt: number })
  | { isPlaying: false; lastPlayed: NowPlayingTrack | null; fetchedAt: number }
  | { error: 'unavailable' }

interface SpotifyItem {
  id: string
  name: string
  duration_ms: number
  artists: Array<{ name: string }>
  album: { name: string; images: Array<{ url: string; width: number }> }
}

function mapItem(item: SpotifyItem): NowPlayingTrack {
  const images = [...(item.album?.images ?? [])].sort((a, b) => b.width - a.width)
  return {
    spotifyId: item.id,
    track: item.name,
    artist: item.artists.map((a) => a.name).join(', '),
    album: item.album?.name ?? '',
    art: images[0]?.url ?? null,
    durationMs: item.duration_ms,
  }
}

export function buildNowPlaying(current: unknown, recent: unknown, now: number): NowPlaying {
  const cur = current as { is_playing?: boolean; progress_ms?: number; item?: SpotifyItem | null } | null
  if (cur?.is_playing && cur.item) {
    return { isPlaying: true, ...mapItem(cur.item), progressMs: cur.progress_ms ?? 0, fetchedAt: now }
  }
  const rec = recent as { items?: Array<{ track: SpotifyItem }> } | null
  const last = rec?.items?.[0]?.track
  return { isPlaying: false, lastPlayed: last ? mapItem(last) : null, fetchedAt: now }
}

export interface SpotifyEnv {
  SPOTIFY_CLIENT_ID: string
  SPOTIFY_CLIENT_SECRET: string
  SPOTIFY_REFRESH_TOKEN: string
}

let tokenCache: { token: string; expiresAt: number } | null = null
export function _resetTokenCache(): void { tokenCache = null }

// Refresh-token grant, cached in module scope until 60 s before expiry.
export async function getAccessToken(env: SpotifyEnv, fetchFn: typeof fetch, now: number): Promise<string> {
  if (tokenCache && now < tokenCache.expiresAt - 60_000) return tokenCache.token
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env.SPOTIFY_REFRESH_TOKEN })
  const res = await fetchFn('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) throw new Error(`token refresh failed: ${res.status}`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  tokenCache = { token: json.access_token, expiresAt: now + json.expires_in * 1000 }
  return json.access_token
}
```

- [ ] **Step 6: Implement `api/now-playing.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildNowPlaying, getAccessToken, type NowPlaying, type SpotifyEnv } from './_spotify'

// Public "what the owner is listening to" feed. Tokens never leave the
// function; the CDN absorbs visitor polling via s-maxage.

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, s-maxage=3, stale-while-revalidate=10')
  res.setHeader('Content-Type', 'application/json')

  const env = process.env as Partial<SpotifyEnv>
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) {
    res.status(200).json({ error: 'unavailable' } satisfies NowPlaying)
    return
  }

  try {
    const token = await getAccessToken(env as SpotifyEnv, fetch, Date.now())
    const auth = { headers: { Authorization: `Bearer ${token}` } }
    const curRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', auth)
    let current: unknown = null
    if (curRes.status === 200) current = await curRes.json()
    else if (curRes.status !== 204) throw new Error(`currently-playing ${curRes.status}`)

    let recent: unknown = null
    const playing = (current as { is_playing?: boolean } | null)?.is_playing
    if (!playing) {
      const recRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', auth)
      if (recRes.ok) recent = await recRes.json()
    }
    res.status(200).json(buildNowPlaying(current, recent, Date.now()))
  } catch (err) {
    console.error('now-playing failed:', err)
    res.status(200).json({ error: 'unavailable' } satisfies NowPlaying)
  }
}
```

- [ ] **Step 7: Run to verify it passes**

Run: `npx vitest run api`
Expected: PASS (6 tests).

- [ ] **Step 8: Write the one-time auth script**

`scripts/spotify-auth.mjs`:
```js
#!/usr/bin/env node
// One-time: obtain a refresh token for the owner's account.
//
//   1. https://developer.spotify.com/dashboard → create app → add redirect
//      URI exactly: http://localhost:8888/callback
//   2. SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node scripts/spotify-auth.mjs
//   3. Open the printed URL, approve, and paste the printed refresh token into
//      Vercel: printf '%s' '<token>' | npx vercel env add SPOTIFY_REFRESH_TOKEN production
//      (use bash printf, not PowerShell piping — PowerShell prepends a BOM).

import { createServer } from 'node:http'

const id = process.env.SPOTIFY_CLIENT_ID
const secret = process.env.SPOTIFY_CLIENT_SECRET
if (!id || !secret) { console.error('set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET'); process.exit(1) }

const redirect = 'http://localhost:8888/callback'
const scope = 'user-read-currently-playing user-read-recently-played'
const url = new URL('https://accounts.spotify.com/authorize')
url.search = new URLSearchParams({ client_id: id, response_type: 'code', redirect_uri: redirect, scope }).toString()

console.log('\nOpen this URL and approve:\n\n' + url.toString() + '\n')

createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost:8888')
  if (u.pathname !== '/callback') { res.statusCode = 404; res.end(); return }
  const code = u.searchParams.get('code')
  if (!code) { res.end('missing code'); return }
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect }),
  })
  const json = await tokenRes.json()
  if (!json.refresh_token) { res.end('failed: ' + JSON.stringify(json)); console.error(json); process.exit(1) }
  res.end('Done — go back to the terminal.')
  console.log('\nSPOTIFY_REFRESH_TOKEN=' + json.refresh_token + '\n')
  process.exit(0)
}).listen(8888, () => console.log('listening on ' + redirect))
```

Append to `.env.example`:
```
# Spotify now-playing feed (server-side only, set in Vercel — NOT VITE_-prefixed,
# so they never reach the browser). Get the refresh token with
# `node scripts/spotify-auth.mjs`. Locally, `npx vercel dev` reads these from .env.local.
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=
```

- [ ] **Step 9: Manual check**

Run `npx vercel dev` (not `vite`) with the three vars in `.env.local`, open `http://localhost:3000/api/now-playing` while Spotify plays on any device. Expected: JSON with `isPlaying: true` and your track; pause → `isPlaying: false, lastPlayed: {…}`; remove the vars → `{ "error": "unavailable" }`. Response header `cache-control: public, s-maxage=3, stale-while-revalidate=10`. `npm run build` still passes (the `api/` folder is outside `src` and untouched by Vite).

- [ ] **Step 10: Commit**

```bash
git add api vercel.json .env.example tsconfig.node.json scripts/spotify-auth.mjs package.json package-lock.json
git commit -m "feat(api): public Spotify now-playing serverless route and one-time auth script"
```

---

### Task 11: Spotify poll store, chip, listen-along, beat-map tier for Spotify

**Files:**
- Create: `src/visualizer/signal/spotifyPoll.ts`, `src/visualizer/ui/SpotifyChip.tsx`
- Modify: `src/store/mixtapeStore.ts` (`playTrackAt`), `src/data/mixtape.ts` (fill `spotifyId` values), `src/visualizer/useSignal.ts` (pass the Spotify input), `src/pages/Mixtape.tsx` (mount chip), `src/styles/visualizer.css`
- Test: `src/visualizer/signal/__tests__/spotifyPoll.test.ts`

**Interfaces:**
- Consumes: `NowPlaying` shape from Task 10 (duplicated as a client type — `api/` is not importable from `src/`); `hasBeatMap` (T9); `useSignal` `SignalInputs.spotify` (T7); `MIXTAPE_TRACKS[].spotifyId` (T9).
- Produces: Zustand store `useSpotifyStore: { status: 'playing' | 'idle' | 'offline' | 'unknown'; now: NowPlayingClient | null; lastFetchedAt: number; positionMs(): number; slug: string | null; start(): () => void }`; `interpolate(progressMs, fetchedAt, now): number` (pure); `slugForSpotifyId(id: string): string | null` (pure); `mixtapeStore.playTrackAt(slug: string, seconds: number): void`.

- [ ] **Step 1: Look up the Spotify IDs and fill `data/mixtape.ts`**

For each of the nine tracks, open the track in Spotify → Share → Copy Song Link → the 22-character id after `/track/`. Add `spotifyId: '<id>'` to each entry in `MIXTAPE_TRACKS`. (Do this by hand; there is no API for it in dev mode.)

- [ ] **Step 2: Write the failing test**

`src/visualizer/signal/__tests__/spotifyPoll.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { interpolate, slugForSpotifyId, useSpotifyStore } from '../spotifyPoll'
import { MIXTAPE_TRACKS } from '../../../data/mixtape'

describe('interpolate', () => {
  it('adds elapsed wall time to progress', () => {
    expect(interpolate(10_000, 1_000, 3_500)).toBe(12_500)
  })
  it('never goes negative', () => {
    expect(interpolate(0, 5_000, 1_000)).toBe(0)
  })
})

describe('slugForSpotifyId', () => {
  it('maps known ids and returns null otherwise', () => {
    const known = MIXTAPE_TRACKS.find((t) => t.spotifyId)
    if (known) expect(slugForSpotifyId(known.spotifyId!)).toBe(known.slug)
    expect(slugForSpotifyId('nope')).toBeNull()
  })
})

describe('useSpotifyStore polling', () => {
  beforeEach(() => { vi.useFakeTimers(); useSpotifyStore.setState({ status: 'unknown', now: null, lastFetchedAt: 0 }) })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('polls every 3 s and sets playing', async () => {
    const payload = { isPlaying: true, spotifyId: 'x', track: 't', artist: 'a', album: 'b', art: null, progressMs: 100, durationMs: 1000, fetchedAt: 1 }
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload)))
    const stop = useSpotifyStore.getState().start()
    await vi.advanceTimersByTimeAsync(0)
    expect(useSpotifyStore.getState().status).toBe('playing')
    await vi.advanceTimersByTimeAsync(3000)
    expect(f).toHaveBeenCalledTimes(2)
    stop()
    await vi.advanceTimersByTimeAsync(9000)
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('goes offline on error payload or network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'unavailable' })))
    const stop = useSpotifyStore.getState().start()
    await vi.advanceTimersByTimeAsync(0)
    expect(useSpotifyStore.getState().status).toBe('offline')
    stop()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('net'))
    const stop2 = useSpotifyStore.getState().start()
    await vi.advanceTimersByTimeAsync(0)
    expect(useSpotifyStore.getState().status).toBe('offline')
    stop2()
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/visualizer/signal/__tests__/spotifyPoll.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement spotifyPoll.ts**

```ts
import { create } from 'zustand'
import { MIXTAPE_TRACKS } from '../../data/mixtape'

// Polls /api/now-playing every 3 s while /mixtape is mounted (paused while
// the tab is hidden) and interpolates the owner's playback position between
// polls. Mirrors api/_spotify.ts NowPlaying — api/ is not importable here.

export interface NowPlayingClient {
  spotifyId: string
  track: string
  artist: string
  album: string
  art: string | null
  durationMs: number
  progressMs?: number
}

export type SpotifyStatus = 'unknown' | 'playing' | 'idle' | 'offline'

interface SpotifyState {
  status: SpotifyStatus
  now: NowPlayingClient | null
  lastFetchedAt: number
  slug: string | null
  positionMs: () => number
  start: () => () => void
}

export const POLL_MS = 3000

export function interpolate(progressMs: number, fetchedAt: number, now: number): number {
  return Math.max(0, progressMs + Math.max(0, now - fetchedAt))
}

export function slugForSpotifyId(id: string): string | null {
  return MIXTAPE_TRACKS.find((t) => t.spotifyId === id)?.slug ?? null
}

export const useSpotifyStore = create<SpotifyState>()((set, get) => ({
  status: 'unknown',
  now: null,
  lastFetchedAt: 0,
  slug: null,

  positionMs: () => {
    const { now, lastFetchedAt, status } = get()
    if (status !== 'playing' || !now) return 0
    return interpolate(now.progressMs ?? 0, lastFetchedAt, Date.now())
  },

  start: () => {
    let timer: number | null = null
    let stopped = false

    const tick = async () => {
      if (stopped) return
      if (typeof document !== 'undefined' && document.hidden) { schedule(); return }
      try {
        const r = await fetch('/api/now-playing')
        const j = (await r.json()) as
          | { error: string }
          | ({ isPlaying: true; fetchedAt: number } & NowPlayingClient)
          | { isPlaying: false; lastPlayed: NowPlayingClient | null; fetchedAt: number }
        if ('error' in j) { set({ status: 'offline' }); schedule(); return }
        // Use our own clock as fetchedAt: the server's clock may drift and
        // the interpolation only needs local elapsed time.
        const fetchedAt = Date.now()
        if (j.isPlaying) {
          const { isPlaying: _p, fetchedAt: _f, ...track } = j
          set({ status: 'playing', now: track, lastFetchedAt: fetchedAt, slug: slugForSpotifyId(track.spotifyId) })
        } else {
          set({ status: 'idle', now: j.lastPlayed, lastFetchedAt: fetchedAt, slug: null })
        }
      } catch {
        set({ status: 'offline' })
      }
      schedule()
    }
    const schedule = () => { if (!stopped) timer = window.setTimeout(tick, POLL_MS) }

    void tick()
    return () => { stopped = true; if (timer) window.clearTimeout(timer) }
  },
}))
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/visualizer/signal/__tests__/spotifyPoll.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: `playTrackAt` in the store**

In `src/store/mixtapeStore.ts`, add to `MixtapeState`: `playTrackAt: (slug: string, seconds: number) => void`, and to the body:
```ts
  // Listen-along: start a local track at a given position (Spotify sync).
  playTrackAt: (slug, seconds) => {
    const index = MIXTAPE_TRACKS.findIndex((t) => t.slug === slug)
    if (index < 0) return
    get().select(index)
    // Howler seeks after load; onLoad fires once, so defer the seek to it.
    const unsub = useMixtapeStore.subscribe((s, prev) => {
      if (s.duration > 0 && prev.duration === 0) {
        seekMixtape(Math.min(seconds, s.duration - 1))
        useMixtapeStore.setState({ progress: seconds })
        unsub()
      }
    })
  },
```

- [ ] **Step 7: SpotifyChip.tsx**

```tsx
import { useEffect, useState } from 'react'
import { useSpotifyStore } from '../signal/spotifyPoll'
import { useMixtapeStore } from '../../store/mixtapeStore'

// Top-right chip: the owner's Spotify now-playing (public feed). Offers
// "▶ listen along" when the track is one of the mixtape songs.

export function SpotifyChip() {
  const status = useSpotifyStore((s) => s.status)
  const now = useSpotifyStore((s) => s.now)
  const slug = useSpotifyStore((s) => s.slug)
  const positionMs = useSpotifyStore((s) => s.positionMs)
  const playTrackAt = useMixtapeStore((s) => s.playTrackAt)
  const [offlineShown, setOfflineShown] = useState(false)

  // spec §7: SPOTIFY OFFLINE for 10 s, then hide.
  useEffect(() => {
    if (status !== 'offline') { setOfflineShown(false); return }
    setOfflineShown(true)
    const id = window.setTimeout(() => setOfflineShown(false), 10_000)
    return () => window.clearTimeout(id)
  }, [status])

  if (status === 'unknown') return null
  if (status === 'offline') return offlineShown ? <span className="viz-chip is-offline">SPOTIFY OFFLINE</span> : null
  if (!now) return null

  return (
    <div className={`viz-chip ${status === 'playing' ? 'is-playing' : 'is-idle'}`}>
      {now.art && <img className="viz-chip-art" src={now.art} alt="" width={28} height={28} />}
      <div className="viz-chip-text">
        <span className="viz-chip-label">{status === 'playing' ? '● SMARTH IS LISTENING' : 'LAST PLAYED'}</span>
        <span className="viz-chip-track">{now.track}</span>
        <span className="viz-chip-artist">{now.artist}</span>
      </div>
      {status === 'playing' && slug && (
        <button
          type="button"
          className="viz-chip-listen"
          onClick={() => playTrackAt(slug, positionMs() / 1000)}
          data-spider-sense
        >
          ▶ listen along
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Wire Spotify into the page and the hook**

In `src/pages/Mixtape.tsx`:
```tsx
import { SpotifyChip } from '../visualizer/ui/SpotifyChip'
import { useSpotifyStore } from '../visualizer/signal/spotifyPoll'
// …
  const spotifyStatus = useSpotifyStore((s) => s.status)
  const spotifySlug = useSpotifyStore((s) => s.slug)
  const positionMs = useSpotifyStore((s) => s.positionMs)
  useEffect(() => useSpotifyStore.getState().start(), [])
  const spotify = useMemo(
    () => ({ playing: spotifyStatus === 'playing', slug: spotifySlug, position: () => positionMs() / 1000 }),
    [spotifyStatus, spotifySlug, positionMs],
  )
  const { signal, nowSeconds, trackKey, kind } = useSignal({ spotify })
// … in .viz-topright, before <ModeBadge>:
        <SpotifyChip />
```
(`useMemo` import added.)

Append to `src/styles/visualizer.css`:
```css
.viz-chip {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; border-radius: 3px;
  background: rgba(10, 10, 14, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.18);
  font: 11px/1.25 'Share Tech Mono', ui-monospace, monospace;
  color: #ddd; max-width: 320px;
}
.viz-chip.is-offline { color: #f88; }
.viz-chip-art { border-radius: 2px; flex: none; }
.viz-chip-text { display: flex; flex-direction: column; min-width: 0; }
.viz-chip-label { color: #1db954; font-size: 9px; letter-spacing: 0.08em; }
.viz-chip.is-idle .viz-chip-label { color: #999; }
.viz-chip-track { font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.viz-chip-artist { opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.viz-chip-listen {
  flex: none; background: var(--universe-primary, #ff2d2d); color: #fff; border: 0;
  padding: 5px 8px; border-radius: 2px; font: inherit; font-weight: 700; cursor: pointer;
}
@media (max-width: 767px) { .viz-chip-text { display: none; } .viz-chip { max-width: none; } }
```

- [ ] **Step 9: Manual check**

Run `npx vercel dev`, open `/mixtape?debug&nointro`. Play a mixtape song on your phone's Spotify → within 3 s the chip shows it with `● SMARTH IS LISTENING` and a `▶ listen along` button; badge reads `SYNCED`; debug `mode synced` and the field morphs from the beat map at your position. Click listen along → local track starts within ~1 s of the Spotify position, badge flips to `LIVE FFT`. Play a non-mixtape song → chip shows it, badge `PROCEDURAL`. Pause Spotify → `LAST PLAYED`. Kill `vercel dev`'s env vars → `SPOTIFY OFFLINE` for 10 s then gone; visualizer keeps running. `npx vitest run`, `npm run build`, `npm run lint`.

- [ ] **Step 10: Commit**

```bash
git add src/visualizer/signal/spotifyPoll.ts src/visualizer/signal/__tests__/spotifyPoll.test.ts src/visualizer/ui/SpotifyChip.tsx src/store/mixtapeStore.ts src/data/mixtape.ts src/visualizer/useSignal.ts src/pages/Mixtape.tsx src/styles/visualizer.css
git commit -m "feat(mixtape): Spotify now-playing chip with listen-along and synced beat-map tier"
```

---

### Task 12: Failure paths, `/visualizer` redirect, reduced motion, performance gate

**Files:**
- Modify: `src/App.tsx` (`/visualizer` → `/mixtape`), `src/pages/Mixtape.tsx` (WebGL fallback view), `src/styles/visualizer.css`; also `C:\Users\shoke\Documents\Claude\Projects\SPIDERMAN\TRACKER.md` (ship notes — lives one level above the git root, not committed)
- Test: `src/visualizer/__tests__/fallback.test.tsx`

**Interfaces:**
- Consumes: everything above.
- Produces: `Mixtape` renders `.viz-fallback` (album-art + deck) when `VisualizerCanvas` calls `onFallback`.

- [ ] **Step 1: Write the failing fallback test**

`src/visualizer/__tests__/fallback.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// jsdom has no WebGL: VisualizerCanvas must call onFallback and the page
// must render the static fallback instead of a canvas.
vi.mock('../signal/spotifyPoll', async (orig) => {
  const m = await orig<typeof import('../signal/spotifyPoll')>()
  m.useSpotifyStore.setState({ start: () => () => {} })
  return m
})

import { Mixtape } from '../../pages/Mixtape'

describe('Mixtape without WebGL', () => {
  it('shows the static fallback and the deck', async () => {
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    expect(await screen.findByTestId('viz-fallback')).toBeInTheDocument()
    expect(screen.getByLabelText('Mixtape deck')).toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/visualizer/__tests__/fallback.test.tsx`
Expected: FAIL — no element with `data-testid="viz-fallback"`.

- [ ] **Step 3: Implement the fallback in Mixtape.tsx**

Add state and swap the canvas:
```tsx
  const [fallback, setFallback] = useState(false)
  const onFallback = useCallback(() => setFallback(true), [])
// …
      {fallback ? (
        <div className="viz-fallback" data-testid="viz-fallback" aria-hidden="true">
          <div className="mixtape-cover">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3 L13.6 8 L18 6.2 L15.6 10.4 L20 11.5 L15.6 13.6 L18 17.8 L13.6 16 L12 21 L10.4 16 L6 17.8 L8.4 13.6 L4 11.5 L8.4 10.4 L6 6.2 L10.4 8 Z" />
              <circle cx="12" cy="11.5" r="1.8" />
            </svg>
          </div>
        </div>
      ) : (
        <VisualizerCanvas signal={signal} nowSeconds={nowSeconds} trackKey={trackKey} debug={debug} onFallback={onFallback} />
      )}
```
and hide the badge when in fallback: `{!fallback && <ModeBadge kind={kind} />}`.

CSS:
```css
.viz-fallback {
  position: fixed; inset: 0; z-index: 0;
  display: grid; place-items: center;
  background: radial-gradient(ellipse at 50% 55%, #14141c 0%, #07070a 65%);
}
.viz-fallback .mixtape-cover { width: min(48vw, 320px); }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/visualizer/__tests__/fallback.test.tsx`
Expected: PASS.

- [ ] **Step 5: Redirect `/visualizer`**

In `src/App.tsx` replace the locked stand-in:
```tsx
import { Navigate } from 'react-router-dom'
// …
      { path: '/visualizer', element: <Navigate to="/mixtape" replace /> },
```
(`Navigate` joins the existing `react-router-dom` import.)

- [ ] **Step 6: Reduced-motion and phone pass**

Manual: enable OS reduced motion (Windows: Settings → Accessibility → Visual effects → Animation effects off), reload `/mixtape`. Expected: no morphs (shape stays sphere, `?debug` shows `morph sphere → sphere`), no beat bloom, gentler breathing, deck snaps instead of sliding, reels don't spin. Disable again.

Phone: Chrome DevTools device toolbar, iPhone 12 Pro, `?debug`. Expected: `dots 12000`, deck wraps to three rows, chip shows art only, ≥ 30 fps in the performance panel.

- [ ] **Step 7: Lighthouse gate on `/`**

Run: `npm run build && npm run preview`, then Chrome Lighthouse (desktop) on `http://localhost:4173/`. Expected: Performance ≥ 90 and no new chunk in the initial requests waterfall — `src/visualizer/*` only appears when navigating to `/mixtape`. Verify with `ls dist/assets | grep -i viz` → the visualizer code lives in the lazy `Mixtape-*.js` chunk (or its own), never `index-*.js`.

- [ ] **Step 8: Update the tracker**

Append to `C:\Users\shoke\Documents\Claude\Projects\SPIDERMAN\TRACKER.md` under a new `## Phase 2.5 — Halftone Field visualizer` heading: what shipped (one line per task 1–12), the three Spotify env vars, `npm run beatmaps` regeneration note, and the `?debug` / `?dots=` / `?nointro` hatches. Update the footer line `*Last updated: …*`.

- [ ] **Step 9: Full verification**

Run: `npx vitest run` (all green), `npm run lint`, `npm run build`. Then the full manual list from spec §8: each of the nine tracks morphs at section boundaries; hide/auto-hide/`H`; listen-along within 1 s; reduced motion; phone; Lighthouse.

- [ ] **Step 10: Commit**

```bash
git add src/App.tsx src/pages/Mixtape.tsx src/styles/visualizer.css src/visualizer/__tests__/fallback.test.tsx
git commit -m "feat(mixtape): WebGL fallback, /visualizer redirect, reduced-motion and perf gates; tracker notes"
```

Then push `main` and let Vercel deploy. Set `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` in the Vercel project (production) before the first deploy that includes Task 10, or the chip will simply stay hidden.
