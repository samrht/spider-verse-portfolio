# /mixtape listen modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mic mode (the dots react to room audio via the microphone) and album-art colours (the dots take the owner's current Spotify cover colours) to /mixtape.

**Architecture:** The FFT band/onset/section logic moves out of `LiveFFT` into a reusable `AnalyserCore`; a new `MicFFT` provider feeds a mic `MediaStreamSource` into it, selected by a new `'mic'` kind at the top of the pure selection table. Album colours come from a pure pixel-bucketing `extractPalette` plus a cached loader, fitted to the universe's backdrop, and applied through a new `ParticleField.setPaletteOverride` that tweens colours without touching the universe's dot style.

**Tech Stack:** Vite 8, React 19, TypeScript 6 (`erasableSyntaxOnly` — no parameter properties; `verbatimModuleSyntax`), Three r184 + R3F 9, Zustand 5, Web Audio API, Vitest + RTL (jsdom). Style: no semicolons, single quotes, 2-space indent.

**Spec:** `docs/superpowers/specs/2026-09-27-mixtape-listen-modes-design.md` (binding).

## Global Constraints

- Commits: plain messages, **no `Co-Authored-By` or any trailer**.
- Lint gate: `npm run lint` stays at exactly **3 errors**, all pre-existing (`src/components/BugleOverlay.tsx`, `src/components/DailyBugle.tsx`, `src/pages/Bugle.tsx`); touched files clean; don't edit those three.
- `react-hooks/set-state-in-effect` is on: no synchronous React `setState` in an effect body (timers/promise callbacks/render-phase adjust are fine).
- The mic source is **never** connected to `ctx.destination`.
- `getUserMedia` constraints exactly: `{ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }`.
- Album colours apply only when Spotify status is `'playing'` AND no local track plays AND mic mode is off AND an `art` URL exists.
- `fitToBackdrop` bounds: light-backdrop universes (616, toon) every colour luminance ≤ 0.6; dark (mcu, verse) every colour ≥ 0.12.
- `extractPalette` rules: 4 bits/channel buckets; skip saturation < 0.18, lightness < 0.08 or > 0.94; score = count × (0.5 + saturation); pairwise RGB distance ≥ 60; `null` if fewer than 2 qualify; with 2, third = first lightened 20 %.
- Existing behaviour unchanged: audio engine, beat maps, Spotify polling, universe decks, fullscreen/clip (except the mic-mode silent clip).
- Gates each task: `npx vitest run` green; `npx tsc --noEmit -p tsconfig.app.json` and `-p tsconfig.node.json` clean; lint gate.

## Review Focus

1. **Mic permission denied or no device** → button returns to off with a visible "MIC BLOCKED" note, no stuck "starting" state, dots keep running on the previous tier. Test in Task 4 (useMicMode blocked path) and Task 3 (useSignal falls back + reports `false`).
2. **Leaving /mixtape (or toggling off) while the mic is live** → every mic track is stopped (browser recording indicator off). Test in Task 2 (`stop()` stops all tracks) and Task 4 (unmount turns mode off).
3. **Rapid Spotify track changes** → only the latest cover's colours apply; a slow earlier load never overwrites a newer one. Test in Task 7.
4. **Greyscale / unreadable cover** → universe palette, not grey dots or an error. Test in Task 5 (`extractPalette` → null; loader error → null) and Task 7 (null → no override).
5. **Universe switch while album colours are active** → the new universe's dot style/blend applies and the colours stay album-derived (re-fitted to the new backdrop). Test in Task 6 (`setUniverse` during override keeps override colours) and Task 7 (fit uses the active universe).

---

### Task 1: Extract AnalyserCore from LiveFFT

**Files:**
- Create: `src/visualizer/signal/analyserCore.ts`
- Modify: `src/visualizer/signal/LiveFFT.ts` (fields, `start`, `stop`, `sample`; add `sharedAudioContext` export)
- Test: `src/visualizer/signal/__tests__/analyserCore.test.ts`; existing `LiveFFT.test.ts` must pass unchanged

**Interfaces:**
- Produces: `class AnalyserCore { attached: boolean (getter); attach(analyser: AnalyserNode, sampleRate: number): void; detach(): void; sample(out: AudioSignal): void }`; `export function sharedAudioContext(): AudioContext` in `LiveFFT.ts` (returns the module's shared context, creating it if needed).

- [ ] **Step 1: Write the failing test** — `src/visualizer/signal/__tests__/analyserCore.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { AnalyserCore } from '../analyserCore'
import { createSignal } from '../types'

function fakeAnalyser(level: { v: number }) {
  return {
    fftSize: 1024,
    frequencyBinCount: 512,
    getByteFrequencyData: (arr: Uint8Array) => arr.fill(level.v),
  } as unknown as AnalyserNode
}

describe('AnalyserCore', () => {
  it('reports live mode and leaves levels alone before attach', () => {
    const core = new AnalyserCore()
    const out = createSignal()
    out.energy = 0.3
    core.sample(out)
    expect(out.mode).toBe('live')
    expect(out.energy).toBe(0.3)
    expect(core.attached).toBe(false)
  })

  it('tracks level once attached', () => {
    const level = { v: 255 }
    const core = new AnalyserCore()
    core.attach(fakeAnalyser(level), 44100)
    expect(core.attached).toBe(true)
    const out = createSignal()
    for (let i = 0; i < 60; i++) core.sample(out)
    expect(out.energy).toBeGreaterThan(0.8)
    expect(out.bass).toBeGreaterThan(0.8)
  })

  it('detach stops sampling', () => {
    const level = { v: 255 }
    const core = new AnalyserCore()
    core.attach(fakeAnalyser(level), 44100)
    core.detach()
    expect(core.attached).toBe(false)
    const out = createSignal()
    core.sample(out)
    expect(out.energy).toBe(0)
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/visualizer/signal/__tests__/analyserCore.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement** — `src/visualizer/signal/analyserCore.ts` (the logic is moved verbatim from `LiveFFT`):

```ts
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
  private sections = new SectionDetector()
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
```

In `src/visualizer/signal/LiveFFT.ts`:
- Remove the imports of `BAND_HZ, bandAverage, binRange, smooth`, `OnsetDetector`, `SectionDetector`; add `import { AnalyserCore } from './analyserCore'`.
- Remove the private fields `bins`, `ranges`, `onset`, `sections`, `lastPerf`, `sm`; add `private readonly core = new AnalyserCore()`.
- In `start()`, replace everything after `this.analyser = analyser` (the `bins`/`ranges`/`lastPerf` setup) with `this.core.attach(analyser, ctx.sampleRate)`.
- `stop()` becomes:

```ts
  stop(): void {
    // Detach only the analyser tap; source → destination stays connected so
    // playback (e.g. navigating away from /mixtape) doesn't go silent.
    if (this.analyser) this.source?.disconnect(this.analyser)
    this.analyser = null
    this.core.detach()
  }
```

- `sample(out, _nowSeconds)` body becomes `this.core.sample(out)`.
- Add, right after `defaultCtx()`:

```ts
// The one AudioContext the page shares (LiveFFT, MicFFT, clip audio taps).
export function sharedAudioContext(): AudioContext {
  return defaultCtx()
}
```

- [ ] **Step 4: Run** `npx vitest run src/visualizer/signal` → PASS (new tests + unchanged `LiveFFT.test.ts`, `bands`, `onset`, `sections`).
- [ ] **Step 5: Gates + commit** — `git commit -m "refactor(mixtape): move FFT band/onset/section analysis into AnalyserCore"`

---

### Task 2: MicFFT provider

**Files:**
- Create: `src/visualizer/signal/MicFFT.ts`
- Test: `src/visualizer/signal/__tests__/MicFFT.test.ts`

**Interfaces:**
- Consumes: `AnalyserCore`, `sharedAudioContext`, `LiveFFT.available()` (Task 1); `SignalProvider` from `./types`.
- Produces: `class MicFFT implements SignalProvider` with `constructor(opts?: { ctxFactory?: () => AudioContext; getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream> })`, `static available(): boolean`, `start(): Promise<void>` (rejects with `Error('AudioContext not running')` or the getUserMedia error), `stop(): void`, `sample(out, now)`; exported `MIC_CONSTRAINTS`.

- [ ] **Step 1: Write the failing test** — `src/visualizer/signal/__tests__/MicFFT.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest'
import { MicFFT, MIC_CONSTRAINTS } from '../MicFFT'
import { createSignal } from '../types'

function fakes(opts: { state?: AudioContextState; level?: number; deny?: boolean } = {}) {
  const track = { stop: vi.fn() }
  const stream = { getTracks: () => [track] } as unknown as MediaStream
  const analyser = { fftSize: 0, smoothingTimeConstant: 0, frequencyBinCount: 512, connect: vi.fn(), getByteFrequencyData: (a: Uint8Array) => a.fill(opts.level ?? 0) }
  const source = { connect: vi.fn(), disconnect: vi.fn() }
  const ctx = {
    sampleRate: 44100, state: opts.state ?? 'running', destination: { dest: true },
    resume: vi.fn(async () => {}),
    createAnalyser: () => analyser,
    createMediaStreamSource: vi.fn(() => source),
  }
  const getUserMedia = vi.fn(async () => { if (opts.deny) throw new DOMException('denied', 'NotAllowedError'); return stream })
  return { ctx: ctx as unknown as AudioContext, analyser, source, track, getUserMedia }
}

describe('MicFFT', () => {
  it('asks for raw audio and wires mic → analyser, never → speakers', async () => {
    const f = fakes()
    const p = new MicFFT({ ctxFactory: () => f.ctx, getUserMedia: f.getUserMedia })
    await p.start()
    expect(f.getUserMedia).toHaveBeenCalledWith(MIC_CONSTRAINTS)
    expect(MIC_CONSTRAINTS).toEqual({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
    expect(f.source.connect).toHaveBeenCalledWith(f.analyser)
    expect(f.source.connect).not.toHaveBeenCalledWith((f.ctx as unknown as { destination: unknown }).destination)
    expect(f.analyser.fftSize).toBe(1024)
  })

  it('tracks level and reports live mode', async () => {
    const f = fakes({ level: 255 })
    const p = new MicFFT({ ctxFactory: () => f.ctx, getUserMedia: f.getUserMedia })
    await p.start()
    const out = createSignal()
    for (let i = 0; i < 60; i++) p.sample(out, 0)
    expect(out.mode).toBe('live')
    expect(out.energy).toBeGreaterThan(0.8)
  })

  it('stop() releases every mic track and disconnects', async () => {
    const f = fakes()
    const p = new MicFFT({ ctxFactory: () => f.ctx, getUserMedia: f.getUserMedia })
    await p.start()
    p.stop()
    expect(f.track.stop).toHaveBeenCalled()
    expect(f.source.disconnect).toHaveBeenCalled()
  })

  it('rejects when permission is denied, without leaving anything open', async () => {
    const f = fakes({ deny: true })
    const p = new MicFFT({ ctxFactory: () => f.ctx, getUserMedia: f.getUserMedia })
    await expect(p.start()).rejects.toThrow()
    expect(f.ctx.createMediaStreamSource).not.toHaveBeenCalled()
    p.stop()
  })

  it('rejects on a context that stays suspended, before prompting', async () => {
    const f = fakes({ state: 'suspended' })
    const p = new MicFFT({ ctxFactory: () => f.ctx, getUserMedia: f.getUserMedia })
    await expect(p.start()).rejects.toThrow(/not running/)
    expect(f.getUserMedia).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/visualizer/signal/__tests__/MicFFT.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `src/visualizer/signal/MicFFT.ts`

```ts
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

  // No parameter properties: tsconfig has erasableSyntaxOnly.
  constructor(opts: { ctxFactory?: () => AudioContext; getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream> } = {}) {
    this.ctxFactory = opts.ctxFactory ?? sharedAudioContext
    this.getMedia = opts.getUserMedia ?? ((c) => navigator.mediaDevices.getUserMedia(c))
  }

  static available(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && LiveFFT.available()
  }

  async start(): Promise<void> {
    if (this.analyser) return
    const ctx = this.ctxFactory()
    await ctx.resume().catch(() => {})
    if (ctx.state !== 'running') throw new Error('AudioContext not running')
    const stream = await this.getMedia(MIC_CONSTRAINTS)
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.6
    source.connect(analyser)
    this.stream = stream
    this.source = source
    this.analyser = analyser
    this.core.attach(analyser, ctx.sampleRate)
  }

  stop(): void {
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
```

- [ ] **Step 4: Run** `npx vitest run src/visualizer/signal` → PASS.
- [ ] **Step 5: Gates + commit** — `git commit -m "feat(mixtape): MicFFT provider (room audio through the shared analyser core)"`

---

### Task 3: 'mic' kind in selection, ModeBadge and useSignal

**Files:**
- Modify: `src/visualizer/signal/select.ts`, `src/visualizer/ui/ModeBadge.tsx`, `src/visualizer/useSignal.ts`
- Test: `src/visualizer/signal/__tests__/select.test.ts` (add), `src/visualizer/__tests__/useSignal.test.ts` (add)

**Interfaces:**
- Consumes: `MicFFT` (Task 2).
- Produces: `ProviderKind` gains `'mic'`; `SelectInput.micOn?: boolean`; `SignalInputs.mic?: { on: boolean; onResult?: (ok: boolean) => void }` and `SignalInputs.makeMic?: () => SignalProvider`; ModeBadge label `'ROOM MIC'`.

- [ ] **Step 1: Write failing tests**

Append to `src/visualizer/signal/__tests__/select.test.ts` (inside its `describe`, or a new one):

```ts
describe('selectProvider mic', () => {
  const base = { localPlaying: true, analyserAvailable: true, localHasBeatMap: true, spotifyPlaying: true, spotifyHasBeatMap: true }
  it('mic wins over everything when on', () => {
    expect(selectProvider({ ...base, micOn: true })).toBe('mic')
    expect(selectProvider({ localPlaying: false, analyserAvailable: false, localHasBeatMap: false, spotifyPlaying: false, spotifyHasBeatMap: false, micOn: true })).toBe('mic')
  })
  it('off or absent changes nothing', () => {
    expect(selectProvider({ ...base, micOn: false })).toBe('live')
    expect(selectProvider(base)).toBe('live')
  })
})
```

(Import `selectProvider` if the file doesn't already.)

Append inside `describe('useSignal', …)` in `src/visualizer/__tests__/useSignal.test.ts`:

```ts
  it('mic on selects the mic provider and reports success', async () => {
    const started = vi.fn(async () => {})
    const mic: SignalProvider = { mode: 'live', start: started, stop: vi.fn(), sample: (o: AudioSignal) => { o.mode = 'live' } }
    const onResult = vi.fn()
    const { result } = renderHook(() => useSignal({ mic: { on: true, onResult }, makeMic: () => mic }))
    expect(result.current.kind).toBe('mic')
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true))
    expect(started).toHaveBeenCalled()
  })

  it('a mic that fails to start reports false and falls back to procedural', async () => {
    const mic: SignalProvider = { mode: 'live', start: vi.fn(async () => { throw new Error('denied') }), stop: vi.fn(), sample: vi.fn() }
    const onResult = vi.fn()
    const { result } = renderHook(() => useSignal({ mic: { on: true, onResult }, makeMic: () => mic }))
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false))
    await waitFor(() => expect(result.current.signal.mode).toBe('procedural'))
  })
```

- [ ] **Step 2: Run** `npx vitest run src/visualizer/signal/__tests__/select.test.ts src/visualizer/__tests__/useSignal.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`src/visualizer/signal/select.ts`:

```ts
export type ProviderKind = 'mic' | 'live' | 'beatmap' | 'procedural' | 'idle'

export interface SelectInput {
  micOn?: boolean
  localPlaying: boolean
  analyserAvailable: boolean
  localHasBeatMap: boolean
  spotifyPlaying: boolean
  spotifyHasBeatMap: boolean
}

export function selectProvider(i: SelectInput): ProviderKind {
  // Mic mode is an explicit takeover (listen-modes spec §2).
  if (i.micOn) return 'mic'
  if (i.localPlaying) {
    if (i.analyserAvailable) return 'live'
    return i.localHasBeatMap ? 'beatmap' : 'procedural'
  }
  if (i.spotifyPlaying) return i.spotifyHasBeatMap ? 'beatmap' : 'procedural'
  return 'idle'
}
```

`src/visualizer/ui/ModeBadge.tsx` — add `mic: 'ROOM MIC',` as the first `LABEL` entry.

`src/visualizer/useSignal.ts`:
- `import { MicFFT } from './signal/MicFFT'`.
- `SignalInputs` gains:

```ts
  // Mic mode: `on` selects the mic; `onResult` reports whether it started.
  mic?: { on: boolean; onResult?: (ok: boolean) => void } | null
  makeMic?: () => SignalProvider
```

- After `const spotify = inputs.spotify ?? null` add:

```ts
  const micOn = !!inputs.mic?.on
  const makeMic = inputs.makeMic ?? null
  const onMicResult = useRef(inputs.mic?.onResult)
  useEffect(() => { onMicResult.current = inputs.mic?.onResult })
```

- Pass `micOn` into `selectProvider({ micOn, … })`.
- In `pick()`, first line: `if (kind === 'mic') return makeMic ? makeMic() : new MicFFT()`.
- In `run()`, after the try/catch and before `if (cancelled)`: `if (kind === 'mic') onMicResult.current?.(!failed)`.

- [ ] **Step 4: Run** `npx vitest run src/visualizer` → PASS (existing useSignal/select tests unchanged).
- [ ] **Step 5: Gates + commit** — `git commit -m "feat(mixtape): 'mic' provider kind at the top of signal selection"`

---

### Task 4: Mic mode on the page (useMicMode, 🎤 button, M key, silent clip)

**Files:**
- Create: `src/visualizer/ui/useMicMode.ts`
- Modify: `src/visualizer/ui/ViewerControls.tsx` (add `MicButton`), `src/pages/Mixtape.tsx`, `src/visualizer/capture/useClipRecorder.ts` (`start(opts?)`), `src/styles/mixtape-universe.css`
- Test: `src/visualizer/ui/__tests__/useMicMode.test.ts`, `src/pages/__tests__/mixtapeViewer.test.tsx` (add), `src/visualizer/capture/__tests__/useClipRecorder.test.ts` (add)

**Interfaces:**
- Consumes: `MicFFT.available()` (Task 2); `SignalInputs.mic` (Task 3).
- Produces: `useMicMode(): { supported: boolean; state: 'off' | 'starting' | 'on' | 'blocked'; on: boolean; toggle(): void; report(ok: boolean): void }` (`on` is true for `starting` and `on`); `MicButton({ state, onToggle })`; `useClipRecorder().start(opts?: { withAudio?: boolean })` (default true).

- [ ] **Step 1: Write failing tests**

`src/visualizer/ui/__tests__/useMicMode.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMicMode, BLOCKED_MS } from '../useMicMode'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('useMicMode', () => {
  it('off → starting → on', () => {
    const { result } = renderHook(() => useMicMode())
    expect(result.current.state).toBe('off')
    act(() => result.current.toggle())
    expect(result.current.state).toBe('starting')
    expect(result.current.on).toBe(true)
    act(() => result.current.report(true))
    expect(result.current.state).toBe('on')
    act(() => result.current.toggle())
    expect(result.current.state).toBe('off')
    expect(result.current.on).toBe(false)
  })

  it('a failed start shows blocked, then returns to off', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useMicMode())
    act(() => result.current.toggle())
    act(() => result.current.report(false))
    expect(result.current.state).toBe('blocked')
    expect(result.current.on).toBe(false)
    act(() => { vi.advanceTimersByTime(BLOCKED_MS) })
    expect(result.current.state).toBe('off')
  })

  it('a late success report after turning off is ignored', () => {
    const { result } = renderHook(() => useMicMode())
    act(() => result.current.toggle())
    act(() => result.current.toggle())
    act(() => result.current.report(true))
    expect(result.current.state).toBe('off')
  })
})
```

Append to `src/pages/__tests__/mixtapeViewer.test.tsx`:

```tsx
  it('shows the mic button when getUserMedia exists, and M toggles it', () => {
    // A running context + a getUserMedia that never settles keeps the mic in 'starting'
    // (deterministic: no async failure flips it to blocked mid-assertion).
    vi.stubGlobal('AudioContext', class { state = 'running'; resume() { return Promise.resolve() } })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(() => new Promise(() => {})) } })
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    const btn = screen.getByLabelText('Turn on room mic (M)')
    expect(btn).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'm' })
    expect(screen.getByLabelText(/room mic/i).getAttribute('aria-pressed')).toBe('true')
    delete (navigator as unknown as Record<string, unknown>).mediaDevices
  })
```

Append to `src/visualizer/capture/__tests__/useClipRecorder.test.ts` (inside the describe):

```ts
  it('start({ withAudio: false }) records video only', () => {
    const { result } = renderHook(() => useClipRecorder())
    act(() => result.current.start({ withAudio: false }))
    expect(result.current.recording).toBe(true)
    act(() => result.current.stop())
  })
```

- [ ] **Step 2: Run** `npx vitest run src/visualizer/ui src/pages src/visualizer/capture` → FAIL.

- [ ] **Step 3: Implement**

`src/visualizer/ui/useMicMode.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { MicFFT } from '../signal/MicFFT'

// Mic mode state (listen-modes spec §3.1). The page's useSignal reports
// whether MicFFT actually started; a failure shows "blocked" briefly.
export const BLOCKED_MS = 4000
export type MicState = 'off' | 'starting' | 'on' | 'blocked'

export function useMicMode() {
  const [supported] = useState(() => MicFFT.available())
  const [state, setState] = useState<MicState>('off')

  const toggle = useCallback(() => {
    setState((s) => (s === 'off' || s === 'blocked' ? 'starting' : 'off'))
  }, [])

  const report = useCallback((ok: boolean) => {
    setState((s) => (s === 'starting' ? (ok ? 'on' : 'blocked') : s))
  }, [])

  useEffect(() => {
    if (state !== 'blocked') return
    const t = window.setTimeout(() => setState((s) => (s === 'blocked' ? 'off' : s)), BLOCKED_MS)
    return () => window.clearTimeout(t)
  }, [state])

  return { supported, state, on: state === 'starting' || state === 'on', toggle, report }
}
```

In `src/visualizer/ui/ViewerControls.tsx` add:

```tsx
export function MicButton({ state, onToggle }: { state: 'off' | 'starting' | 'on' | 'blocked'; onToggle: () => void }) {
  const on = state === 'on' || state === 'starting'
  return (
    <span className="viz-mic-wrap">
      <button type="button" className={`viz-ctl viz-mic ${on ? 'is-on' : ''}`} onClick={onToggle}
        aria-label={on ? 'Turn off room mic (M)' : 'Turn on room mic (M)'} aria-pressed={on} data-spider-sense>🎤</button>
      {state === 'blocked' && <span className="viz-mic-note" role="status">MIC BLOCKED</span>}
    </span>
  )
}
```

In `src/visualizer/capture/useClipRecorder.ts` change `const start = useCallback(() => {` to `const start = useCallback((opts: { withAudio?: boolean } = {}) => {` and `const tap = audioTap(getMediaElement())` to `const tap = opts.withAudio === false ? null : audioTap(getMediaElement())`.

In `src/pages/Mixtape.tsx`:
- Import `useMicMode` from `'../visualizer/ui/useMicMode'` and `MicButton` (add to the ViewerControls import).
- Before `useSignal`, add `const mic = useMicMode()`; change the call to `useSignal({ spotify, mic: { on: mic.on, onResult: mic.report } })`.
- `keys.current` also carries `mic`; in the key handler add `if ((e.key === 'm' || e.key === 'M') && k.mic.supported) k.mic.toggle()`, and change the C branch to start with `k.clip.start({ withAudio: kind !== 'mic' })` — carry `kind` in `keys.current` too.
- Pass the same to the ClipButton: `onStart={() => clip.start({ withAudio: kind !== 'mic' })}`.
- In `.viz-topright`, before the clip button: `{mic.supported && !fallback && <MicButton state={mic.state} onToggle={mic.toggle} />}`.
- Leaving the page: `useMicMode` state dies with the component, and `useSignal`'s effect cleanup stops the provider (mic tracks released) — no extra code.

Append to `src/styles/mixtape-universe.css`:

```css
.viz-mic-wrap { position: relative; display: inline-flex; }
.viz-mic.is-on { background: var(--u-accent); color: var(--u-bg); }
.viz-mic-note {
  position: absolute; top: calc(100% + 6px); right: 0; white-space: nowrap; padding: 4px 6px;
  background: #ff2d2d; color: #fff; font: 700 10px/1 var(--u-font-body); letter-spacing: .12em;
}
```

- [ ] **Step 4: Run** `npx vitest run` → PASS.
- [ ] **Step 5: Gates + commit** — `git commit -m "feat(mixtape): room-mic mode toggle (M) with blocked state and silent clips while listening"`

---

### Task 5: Album-art palette (extract, load, fit)

**Files:**
- Create: `src/visualizer/signal/artPalette.ts`
- Test: `src/visualizer/signal/__tests__/artPalette.test.ts`

**Interfaces:**
- Consumes: `VIZ_STYLES`, `relativeLuminance` from `../engine/vizStyles`; `Universe`.
- Produces: `type Palette3 = [string, string, string]`; `extractPalette(pixels: Uint8ClampedArray): Palette3 | null`; `artPalette(url: string, load?: (url: string) => Promise<Uint8ClampedArray | null>): Promise<Palette3 | null>`; `fitToBackdrop(colors: Palette3, universe: Universe): Palette3`; `clearArtCache(): void` (tests).

- [ ] **Step 1: Write the failing test** — `src/visualizer/signal/__tests__/artPalette.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractPalette, artPalette, fitToBackdrop, clearArtCache } from '../artPalette'
import { relativeLuminance } from '../../engine/vizStyles'
import { UNIVERSE_IDS } from '../../../store/universeStore'

function img(colors: Array<[number, number, number, number]>): Uint8ClampedArray {
  // colors: [r, g, b, count]
  const px: number[] = []
  for (const [r, g, b, n] of colors) for (let i = 0; i < n; i++) px.push(r, g, b, 255)
  return new Uint8ClampedArray(px)
}

beforeEach(() => clearArtCache())

describe('extractPalette', () => {
  it('returns the strongest distinct colours, most dominant first', () => {
    const p = extractPalette(img([[220, 30, 30, 500], [30, 60, 220, 300], [240, 200, 20, 200]]))!
    expect(p).toHaveLength(3)
    expect(p[0]).toMatch(/^#[0-9a-f]{6}$/)
    const r = parseInt(p[0].slice(1, 3), 16), b = parseInt(p[1].slice(5, 7), 16)
    expect(r).toBeGreaterThan(180)
    expect(b).toBeGreaterThan(180)
  })

  it('returns null for a greyscale cover', () => {
    expect(extractPalette(img([[128, 128, 128, 800], [20, 20, 20, 100], [250, 250, 250, 100]]))).toBeNull()
  })

  it('collapses near-duplicate colours; with two colours the third is a lighter first', () => {
    const p = extractPalette(img([[220, 30, 30, 500], [225, 35, 32, 400], [30, 60, 220, 300]]))!
    expect(p).not.toBeNull()
    expect(relativeLuminance(p[2])).toBeGreaterThan(relativeLuminance(p[0]))
  })
})

describe('artPalette', () => {
  it('returns null when the image cannot be read', async () => {
    expect(await artPalette('https://x/a.jpg', async () => null)).toBeNull()
  })

  it('caches per URL', async () => {
    const load = vi.fn(async () => img([[220, 30, 30, 500], [30, 60, 220, 300]]))
    const a = await artPalette('https://x/b.jpg', load)
    const b = await artPalette('https://x/b.jpg', load)
    expect(a).toEqual(b)
    expect(load).toHaveBeenCalledTimes(1)
  })
})

describe('fitToBackdrop', () => {
  it('keeps every colour inside the luminance bounds for each universe', () => {
    const pale: [string, string, string] = ['#ffffff', '#fff5cc', '#ccffee']
    const dark: [string, string, string] = ['#000000', '#101020', '#200010']
    for (const u of UNIVERSE_IDS) {
      const light = u === '616' || u === 'toon'
      for (const c of [...fitToBackdrop(pale, u), ...fitToBackdrop(dark, u)]) {
        if (light) expect(relativeLuminance(c)).toBeLessThanOrEqual(0.6)
        else expect(relativeLuminance(c)).toBeGreaterThanOrEqual(0.12)
      }
    }
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/visualizer/signal/__tests__/artPalette.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `src/visualizer/signal/artPalette.ts`

```ts
import type { Universe } from '../../store/universeStore'
import { VIZ_STYLES, relativeLuminance } from '../engine/vizStyles'

// Album-art colours (listen-modes spec §4). Pure pixel bucketing + a cached
// loader + a backdrop fit so the dots stay visible in every universe.
export type Palette3 = [string, string, string]

const SIZE = 32
const MAX_CACHE = 20
const cache = new Map<string, Promise<Palette3 | null>>()

export function clearArtCache(): void { cache.clear() }

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    const a = s * Math.min(l, 1 - l)
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(v * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

export function extractPalette(pixels: Uint8ClampedArray): Palette3 | null {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number; s: number }>()
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3]
    if (a < 128) continue
    const [, s, l] = rgbToHsl(r, g, b)
    if (s < 0.18 || l < 0.08 || l > 0.94) continue
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, s: 0 }
    e.n++; e.r += r; e.g += g; e.b += b; e.s += s
    buckets.set(key, e)
  }
  const ranked = [...buckets.values()]
    .map((e) => ({ rgb: [e.r / e.n, e.g / e.n, e.b / e.n] as [number, number, number], score: e.n * (0.5 + e.s / e.n) }))
    .sort((a, b) => b.score - a.score)
  const picked: Array<[number, number, number]> = []
  for (const c of ranked) {
    if (picked.every((p) => Math.hypot(p[0] - c.rgb[0], p[1] - c.rgb[1], p[2] - c.rgb[2]) >= 60)) picked.push(c.rgb)
    if (picked.length === 3) break
  }
  if (picked.length < 2) return null
  const hexes = picked.map((p) => toHex(...p))
  if (hexes.length === 2) {
    const [h, s, l] = rgbToHsl(...picked[0])
    hexes.push(hslToHex(h, s, Math.min(0.94, l * 1.2)))
  }
  return [hexes[0], hexes[1], hexes[2]]
}

async function loadPixels(url: string): Promise<Uint8ClampedArray | null> {
  try {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(image, 0, 0, SIZE, SIZE)
    return ctx.getImageData(0, 0, SIZE, SIZE).data
  } catch {
    return null
  }
}

export function artPalette(url: string, load: (url: string) => Promise<Uint8ClampedArray | null> = loadPixels): Promise<Palette3 | null> {
  const hit = cache.get(url)
  if (hit) return hit
  const p = load(url).then((px) => (px ? extractPalette(px) : null)).catch(() => null)
  cache.set(url, p)
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string)
  return p
}

export function fitToBackdrop(colors: Palette3, universe: Universe): Palette3 {
  const light = VIZ_STYLES[universe].lightBackdrop
  const fit = (hex: string) => {
    const [h, s, l0] = rgbToHsl(...hexToRgb(hex))
    let l = l0
    let out = hex
    for (let i = 0; i < 40; i++) {
      const lum = relativeLuminance(out)
      if (light ? lum <= 0.6 : lum >= 0.12) break
      l = light ? l - 0.025 : l + 0.025
      out = hslToHex(h, s, Math.max(0, Math.min(1, l)))
    }
    return out
  }
  return [fit(colors[0]), fit(colors[1]), fit(colors[2])]
}
```

- [ ] **Step 4: Run** `npx vitest run src/visualizer/signal` → PASS.
- [ ] **Step 5: Gates + commit** — `git commit -m "feat(mixtape): album-art palette extraction, cached loader and backdrop fit"`

---

### Task 6: ParticleField.setPaletteOverride + VisualizerCanvas prop

**Files:**
- Modify: `src/visualizer/engine/ParticleField.ts`, `src/visualizer/VisualizerCanvas.tsx`
- Test: `src/visualizer/engine/__tests__/particleField.test.ts` (add)

**Interfaces:**
- Consumes: existing `setUniverse`, tween machinery, `snapshot()`.
- Produces: `ParticleField.setPaletteOverride(colors: [string, string, string] | null): void`; `VisualizerCanvasProps.paletteOverride?: [string, string, string] | null`.

- [ ] **Step 1: Write failing tests** — append to `particleField.test.ts`:

```ts
describe('ParticleField.setPaletteOverride', () => {
  it('tweens to the override without changing style or blend', () => {
    const f = new ParticleField(200)
    f.setUniverse('mcu', true)
    const before = f.snapshot()
    f.setPaletteOverride(['#112233', '#445566', '#778899'])
    f.update(sig(), 1)
    const s = f.snapshot()
    expect(s.palette).toEqual(['#112233', '#445566', '#778899'])
    expect(s.style).toBe(before.style)
    expect(s.blending).toBe(before.blending)
  })

  it('null returns to the universe palette', () => {
    const f = new ParticleField(200)
    f.setUniverse('616', true)
    const universe = f.snapshot().palette
    f.setPaletteOverride(['#112233', '#445566', '#778899'])
    f.update(sig(), 1)
    f.setPaletteOverride(null)
    f.update(sig(), 1)
    expect(f.snapshot().palette).toEqual(universe)
  })

  it('a universe switch during an override keeps the override colours but takes the new style', () => {
    const f = new ParticleField(200)
    f.setUniverse('616', true)
    f.setPaletteOverride(['#112233', '#445566', '#778899'])
    f.update(sig(), 1)
    f.setUniverse('mcu')
    f.update(sig(), 1)
    const s = f.snapshot()
    expect(s.palette).toEqual(['#112233', '#445566', '#778899'])
    expect(s.style).toBe(1)
  })
})
```

- [ ] **Step 2: Run** → FAIL (`setPaletteOverride is not a function`).

- [ ] **Step 3: Implement** — in `ParticleField.ts`:
- Add fields `private universe: Universe = 'verse'` and `private override: THREE.Color[] | null = null`.
- Make the tween's `style` optional: type `{ from: THREE.Color[]; to: THREE.Color[]; t: number; style: VizStyle | null; applied: boolean }`; in `stepTween`, only call `applyStyle` when `tw.style` is non-null.
- In `setUniverse(u, instant)`: set `this.universe = u`, and compute `const to = this.override ? this.override.map((c) => c.clone()) : paletteFor(u)`.
- Add:

```ts
  // Album-art colours (listen-modes spec §4.2): tween the palette only; the
  // universe's dot style and blend stay. null tweens back to the universe.
  setPaletteOverride(colors: [string, string, string] | null): void {
    this.override = colors ? colors.map((c) => new THREE.Color(c)) : null
    const to = this.override ? this.override.map((c) => c.clone()) : paletteFor(this.universe)
    if (this.reduced) {
      this.u.uPalette.value.forEach((c, i) => c.copy(to[i]))
      this.tween = null
      return
    }
    this.tween = { from: this.u.uPalette.value.map((c) => c.clone()), to, t: 0, style: null, applied: true }
  }
```

In `VisualizerCanvas.tsx`: add `paletteOverride?: [string, string, string] | null` to the props (comment `// album-art colours, or null for the universe palette`); `Field` destructures it; add `useEffect(() => { field.setPaletteOverride(paletteOverride ?? null) }, [field, paletteOverride])` after the universe effect.

- [ ] **Step 4: Run** `npx vitest run src/visualizer` → PASS (existing setUniverse tests unchanged).
- [ ] **Step 5: Gates + commit** — `git commit -m "feat(mixtape): palette override on the particle field (keeps the universe dot style)"`

---

### Task 7: useArtPalette + page wiring + chip swatches

**Files:**
- Create: `src/visualizer/ui/useArtPalette.ts`
- Modify: `src/pages/Mixtape.tsx`, `src/visualizer/ui/SpotifyChip.tsx`, `src/styles/visualizer.css`
- Test: `src/visualizer/ui/__tests__/useArtPalette.test.ts`

**Interfaces:**
- Consumes: `artPalette`, `fitToBackdrop`, `Palette3` (Task 5); `paletteOverride` prop (Task 6); `useSpotifyStore` (`status`, `now.art`); `useMixtapeStore.isPlaying`.
- Produces: `useArtPalette(opts: { micOn: boolean; load?: (url: string) => Promise<Palette3 | null> }): Palette3 | null`; `SpotifyChip({ swatches?: Palette3 | null })`.

- [ ] **Step 1: Write the failing test** — `src/visualizer/ui/__tests__/useArtPalette.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('../../../engine/mixtapeEngine', () => ({
  disposeMixtape: vi.fn(), loadMixtapeTrack: vi.fn(), pauseMixtape: vi.fn(), playMixtape: vi.fn(),
  seekMixtape: vi.fn(), setMixtapeCallbacks: vi.fn(), setMixtapeVolume: vi.fn(),
  getMixtapeDuration: () => 0, getCurrentSlug: () => null, getMediaElement: () => null,
}))

import { useArtPalette } from '../useArtPalette'
import { useSpotifyStore } from '../../signal/spotifyPoll'
import { useMixtapeStore } from '../../../store/mixtapeStore'
import { useUniverseStore } from '../../../store/universeStore'
import type { Palette3 } from '../../signal/artPalette'

const RED: Palette3 = ['#dd2222', '#2244dd', '#eecc22']
const now = (art: string) => ({ spotifyId: 'x', track: 't', artist: 'a', album: 'al', art, durationMs: 1, progressMs: 0 })

beforeEach(() => {
  useMixtapeStore.setState({ isPlaying: false })
  useUniverseStore.setState({ activeUniverse: 'mcu' })
  useSpotifyStore.setState({ status: 'playing', now: now('https://i/a.jpg') } as never)
})

describe('useArtPalette', () => {
  it('returns fitted album colours while Spotify plays and nothing local or mic', async () => {
    const load = vi.fn(async () => RED)
    const { result } = renderHook(() => useArtPalette({ micOn: false, load }))
    await waitFor(() => expect(result.current).not.toBeNull())
    expect(result.current).toHaveLength(3)
  })

  it('is null when a local track plays, when the mic is on, or when Spotify is idle', async () => {
    const load = vi.fn(async () => RED)
    useMixtapeStore.setState({ isPlaying: true })
    const a = renderHook(() => useArtPalette({ micOn: false, load }))
    expect(a.result.current).toBeNull()
    useMixtapeStore.setState({ isPlaying: false })
    const b = renderHook(() => useArtPalette({ micOn: true, load }))
    expect(b.result.current).toBeNull()
    useSpotifyStore.setState({ status: 'idle' } as never)
    const c = renderHook(() => useArtPalette({ micOn: false, load }))
    expect(c.result.current).toBeNull()
  })

  it('latest cover wins when a slow earlier load resolves after a newer one', async () => {
    let resolveSlow: (p: Palette3) => void = () => {}
    const load = vi.fn((url: string) => url.endsWith('a.jpg')
      ? new Promise<Palette3>((r) => { resolveSlow = r })
      : Promise.resolve<Palette3>(['#22dd22', '#2244dd', '#dd22dd']))
    const { result } = renderHook(() => useArtPalette({ micOn: false, load }))
    act(() => { useSpotifyStore.setState({ now: now('https://i/b.jpg') } as never) })
    await waitFor(() => expect(result.current).not.toBeNull())
    const newer = result.current
    await act(async () => { resolveSlow(RED) })
    expect(result.current).toEqual(newer)
  })

  it('a greyscale or unreadable cover gives null', async () => {
    const load = vi.fn(async () => null)
    const { result } = renderHook(() => useArtPalette({ micOn: false, load }))
    await act(async () => { await Promise.resolve() })
    expect(result.current).toBeNull()
  })
})
```

Check the real `NowPlaying`/store shape in `src/visualizer/signal/spotifyPoll.ts` before running (fields `status`, `now: { spotifyId, track, artist, album, art, durationMs, … } | null`); adjust the `now()` helper's fields to match if they differ.

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** — `src/visualizer/ui/useArtPalette.ts`

```ts
import { useEffect, useMemo, useState } from 'react'
import { useSpotifyStore } from '../signal/spotifyPoll'
import { useMixtapeStore } from '../../store/mixtapeStore'
import { useUniverseStore } from '../../store/universeStore'
import { artPalette, fitToBackdrop, type Palette3 } from '../signal/artPalette'

// Album-art colours (listen-modes spec §4.1): only while the owner's Spotify
// is playing, nothing local plays and the mic is off. The loaded palette is
// keyed by URL, so a stale load can never apply to a newer cover.
export function useArtPalette(opts: { micOn: boolean; load?: (url: string) => Promise<Palette3 | null> }): Palette3 | null {
  const status = useSpotifyStore((s) => s.status)
  const art = useSpotifyStore((s) => s.now?.art ?? null)
  const localPlaying = useMixtapeStore((s) => s.isPlaying)
  const universe = useUniverseStore((s) => s.activeUniverse)
  const active = status === 'playing' && !localPlaying && !opts.micOn && !!art
  const load = opts.load ?? artPalette
  const [loaded, setLoaded] = useState<{ url: string; colors: Palette3 | null } | null>(null)

  useEffect(() => {
    if (!active || !art) return
    let cancelled = false
    load(art).then((colors) => { if (!cancelled) setLoaded({ url: art, colors }) }, () => {})
    return () => { cancelled = true }
  }, [active, art, load])

  return useMemo(() => {
    if (!active || !loaded || loaded.url !== art || !loaded.colors) return null
    return fitToBackdrop(loaded.colors, universe)
  }, [active, loaded, art, universe])
}
```

Note: `load` from `opts` must be stable across renders in the page (it is: default `artPalette` module function). In tests the `vi.fn` is created once per renderHook call.

`src/visualizer/ui/SpotifyChip.tsx`: change the signature to `export function SpotifyChip({ swatches = null }: { swatches?: [string, string, string] | null } = {})` and, right after the `<img className="viz-chip-art" …/>` line, add:

```tsx
      {swatches && (
        <span className="viz-chip-swatches" aria-hidden="true">
          {swatches.map((c) => <i key={c} style={{ background: c }} />)}
        </span>
      )}
```

Append to `src/styles/visualizer.css`:

```css
.viz-chip-swatches { display: flex; flex-direction: column; gap: 2px; flex: none; }
.viz-chip-swatches i { display: block; width: 8px; height: 8px; border: 1px solid rgba(0, 0, 0, .4); }
```

`src/pages/Mixtape.tsx`:
- `import { useArtPalette } from '../visualizer/ui/useArtPalette'`.
- After `const mic = useMicMode()` … `useSignal(...)`: `const artColors = useArtPalette({ micOn: mic.on })`.
- `<VisualizerCanvas … paletteOverride={artColors} />` and `<SpotifyChip swatches={artColors} />`.

- [ ] **Step 4: Run** `npx vitest run` → PASS.
- [ ] **Step 5: Gates + commit** — `git commit -m "feat(mixtape): album-art colours from the owner's Spotify cover, with chip swatches"`

---

### Task 8: Browser verification and docs

**Files:** `C:\Users\shoke\Documents\Claude\Projects\SPIDERMAN\TRACKER.md` (outside the repo) only, unless defects are found (fix each in its own commit with a test where possible).

- [ ] **Step 1:** `npm run build && npx vite preview --port 4173 --strictPort` (background; IPv6 localhost only → `http://localhost:4173`).
- [ ] **Step 2: Mic mode.** Headless Chrome over CDP with `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --autoplay-policy=no-user-gesture-required` (Chrome's fake mic is a beeping tone). Open `/mixtape`, click the 🎤 button (real `Input.dispatchMouseEvent`), wait 2 s: badge reads `ROOM MIC`, `aria-pressed="true"`, and sampling `document.querySelector('main.viz-page').style.getPropertyValue('--beat')` or reading the signal energy via `?debug` shows non-zero activity. Click again: button off, badge back to a non-mic kind. Then launch Chrome **without** `--use-fake-ui-for-media-stream` and with `--deny-permission-prompts` (or reject via `Browser.setPermission` `{ name: 'audioCapture' }` → `denied`): clicking shows `MIC BLOCKED`, then off after ~4 s.
- [ ] **Step 3: Album colours.** With Spotify env configured only in production, simulate locally: in the page, `useSpotifyStore.setState` is not reachable from CDP, so instead intercept `/api/now-playing` with `Fetch.enable` + `Fetch.fulfillRequest` returning `{"isPlaying":true,"spotifyId":"x","track":"Test","artist":"Artist","album":"A","art":"https://i.scdn.co/image/ab67616d0000b2734d08fc99eff4ed52dfce91fa","durationMs":200000,"progressMs":1000,"fetchedAt":<now>}`. Load `/mixtape` in 616 and in MCU: screenshot; the chip shows three swatches; the dots are visibly in the cover's colours; no console errors. Press play on a local track: colours return to the universe palette within ~0.5 s.
- [ ] **Step 4:** Full gates (`npx vitest run`, both `tsc`, lint = 3 pre-existing, `npm run build`); confirm `artPalette`/`MicFFT` code is only in the `Mixtape-*.js` chunk. Stop the preview server.
- [ ] **Step 5:** Append a "Listen modes" section to `TRACKER.md` with what shipped and anything left.
