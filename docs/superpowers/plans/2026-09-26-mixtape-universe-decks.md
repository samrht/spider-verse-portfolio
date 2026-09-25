# /mixtape universe decks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/mixtape` part of the four-universe comic: it opens in the universe you came from, switches via the page-corner index, and each universe gets its own deck object and its own way of drawing the halftone dots.

**Architecture:** One `useDeckControls()` hook holds all deck logic; four presentational faces (`InkedCassette`, `HudRing`, `Boombox`, `GlitchCassette`) render it from shared control parts; `Deck` is a thin shell that picks the face per universe. A pure `VIZ_STYLES` table drives the particle shader (style/ink uniforms, blend mode, palette tween) and the page backdrop is CSS keyed on `data-universe`. The beat reaches CSS as a `--beat` variable written once per frame on the page root.

**Tech Stack:** Vite 8, React 19, TypeScript 6 (`erasableSyntaxOnly`, `verbatimModuleSyntax`), Three r184 + R3F 9, GSAP 3, Zustand 5, Vitest + RTL (jsdom). Code style: no semicolons, single quotes, 2-space indent.

**Spec:** `docs/superpowers/specs/2026-09-26-mixtape-universe-decks-design.md` (read it; it is binding).

## Global Constraints

- Commits: plain messages, **no `Co-Authored-By` or any trailer** (owner rule).
- Lint gate: `npm run lint` must stay at exactly **3 errors**, all pre-existing in `src/components/BugleOverlay.tsx`, `src/components/DailyBugle.tsx`, `src/pages/Bugle.tsx`. Every touched file lint-clean. Do not edit those three files.
- React lint rule `react-hooks/set-state-in-effect` is on: never call a React `setState` synchronously inside `useEffect`; use the render-phase adjust pattern or a timer/callback.
- Every face exposes the same accessible names (spec §4.1): `Track progress`, `Toggle shuffle`, `Previous track`, `Play`/`Pause`, `Next track`, `Repeat: off|all|one`, `Volume`, `Toggle tracklist`, `Hide player (H)`.
- Palettes (spec §5): 616 `#c0392b #1f4e9c #1b1b1b`; mcu `#7fb7ff #ff2d2d #e6f1ff`; toon `#ff3b3b #1f6feb #101010`; verse `#ff2d6b #00e5ff #ffffff`.
- Reduced motion: no flicker, flash, bounce, swell, face cross-fade; colours/backdrops/blend still change.
- Audio engine, beat maps, `useSignal`, Spotify polling, morph targets and `MorphMachine`: **do not modify**.
- Gates at the end of every task: `npx vitest run` green, `npx tsc --noEmit -p tsconfig.app.json` and `-p tsconfig.node.json` clean, lint gate above.

## Review Focus

1. **Arriving on `/mixtape` with no prior universe (fresh load / bookmark)** → the store default `616` look, not verse and not a flash of verse first. Test in Task 9 (`Mixtape` renders `data-universe="616"` when the store is `616`) and Task 2 (first `setUniverse` is instant).
2. **Switching universes rapidly (←→←→ faster than the 200 ms cross-fade)** → the deck ends on the last universe pressed, never stuck mid-fade or showing a stale face. Test in Task 4 (two switches inside one fade window end on the second face).
3. **Deck hidden, then universe switched** → the new face is still hidden and `inert`; revealing shows the new face. Test in Task 4.
4. **Dots on the light backdrops (616 cream, toon yellow)** must stay visible: normal blending and no near-white palette colours. Test in Task 1 (luminance invariant) and Task 2 (blend set on switch).
5. **Keyboard seeking on the MCU HUD ring**, where the visible control is an arc → the hidden `Track progress` range still seeks and is reachable by Tab. Test in Task 6.

---

### Task 1: Per-universe visualizer style table

**Files:**
- Create: `src/visualizer/engine/vizStyles.ts`
- Modify: `src/visualizer/engine/palette.ts` (whole file)
- Test: `src/visualizer/engine/__tests__/vizStyles.test.ts`, keep `src/visualizer/engine/__tests__/palette.test.ts` passing

**Interfaces:**
- Produces: `VizStyle`, `DotStyle`, `BeatFx`, `Blend` types; `VIZ_STYLES: Record<Universe, VizStyle>`; `DOT_STYLE_INDEX: Record<DotStyle, number>`; `relativeLuminance(hex: string): number`; `paletteFor(u: Universe): [THREE.Color, THREE.Color, THREE.Color]` (now sourced from `VIZ_STYLES`).

- [ ] **Step 1: Write the failing test** — `src/visualizer/engine/__tests__/vizStyles.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { VIZ_STYLES, DOT_STYLE_INDEX, relativeLuminance } from '../vizStyles'
import { paletteFor } from '../palette'
import { UNIVERSE_IDS } from '../../../store/universeStore'

describe('VIZ_STYLES', () => {
  it('has an entry for every universe', () => {
    for (const u of UNIVERSE_IDS) expect(VIZ_STYLES[u]).toBeDefined()
  })

  it('keeps dots visible on light backdrops: normal blend, no near-white colours', () => {
    for (const u of UNIVERSE_IDS) {
      const s = VIZ_STYLES[u]
      if (!s.lightBackdrop) continue
      expect(s.blend).toBe('normal')
      for (const c of s.palette) expect(relativeLuminance(c)).toBeLessThanOrEqual(0.6)
    }
  })

  it('maps every dot style to a distinct shader index', () => {
    expect(new Set(Object.values(DOT_STYLE_INDEX)).size).toBe(4)
  })

  it('matches the spec table', () => {
    expect(VIZ_STYLES['616']).toMatchObject({ blend: 'normal', dot: 'ink', beatFx: 'swell', lightBackdrop: true })
    expect(VIZ_STYLES.mcu).toMatchObject({ blend: 'additive', dot: 'holo', beatFx: 'pulse', lightBackdrop: false })
    expect(VIZ_STYLES.toon).toMatchObject({ blend: 'normal', dot: 'cel', beatFx: 'bounce', lightBackdrop: true })
    expect(VIZ_STYLES.verse).toMatchObject({ blend: 'additive', dot: 'glitch', beatFx: 'split', lightBackdrop: false })
  })
})

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1)
  })
})

describe('paletteFor', () => {
  it('reads its colours from VIZ_STYLES', () => {
    for (const u of UNIVERSE_IDS) {
      expect(paletteFor(u).map((c) => '#' + c.getHexString())).toEqual([...VIZ_STYLES[u].palette])
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/visualizer/engine/__tests__/vizStyles.test.ts`
Expected: FAIL — `Cannot find module '../vizStyles'`.

- [ ] **Step 3: Implement** — `src/visualizer/engine/vizStyles.ts`

```ts
import type { Universe } from '../../store/universeStore'

// Per-universe look of the Halftone Field (spec §5). Pure data: no DOM, no
// THREE. ParticleField turns an entry into shader uniforms + blend mode; the
// page backdrop is CSS keyed on data-universe.

export type Blend = 'normal' | 'additive'
export type DotStyle = 'ink' | 'holo' | 'cel' | 'glitch'
export type BeatFx = 'swell' | 'pulse' | 'bounce' | 'split'

export interface VizStyle {
  blend: Blend
  palette: readonly [string, string, string]
  ink: string
  dot: DotStyle
  beatFx: BeatFx
  lightBackdrop: boolean
}

export const DOT_STYLE_INDEX: Record<DotStyle, number> = { ink: 0, holo: 1, cel: 2, glitch: 3 }

export const VIZ_STYLES: Record<Universe, VizStyle> = {
  '616': { blend: 'normal', palette: ['#c0392b', '#1f4e9c', '#1b1b1b'], ink: '#1b1b1b', dot: 'ink', beatFx: 'swell', lightBackdrop: true },
  mcu: { blend: 'additive', palette: ['#7fb7ff', '#ff2d2d', '#e6f1ff'], ink: '#7fb7ff', dot: 'holo', beatFx: 'pulse', lightBackdrop: false },
  toon: { blend: 'normal', palette: ['#ff3b3b', '#1f6feb', '#101010'], ink: '#101010', dot: 'cel', beatFx: 'bounce', lightBackdrop: true },
  verse: { blend: 'additive', palette: ['#ff2d6b', '#00e5ff', '#ffffff'], ink: '#ffffff', dot: 'glitch', beatFx: 'split', lightBackdrop: false },
}

// WCAG relative luminance of a #rrggbb colour, 0 (black) … 1 (white).
export function relativeLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
```

Replace `src/visualizer/engine/palette.ts` with:

```ts
import * as THREE from 'three'
import type { Universe } from '../../store/universeStore'
import { VIZ_STYLES } from './vizStyles'

// Dot colours per universe, sourced from VIZ_STYLES so the table stays the
// single source (spec §5). Kept as data, not read from CSS, so the engine has
// no DOM dependency.
export function paletteFor(u: Universe): [THREE.Color, THREE.Color, THREE.Color] {
  const [a, b, c] = VIZ_STYLES[u].palette
  return [new THREE.Color(a), new THREE.Color(b), new THREE.Color(c)]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/visualizer/engine`
Expected: PASS (new file + existing `palette.test.ts`: 616 primary `c0392b`, mcu `7fb7ff`).

- [ ] **Step 5: Commit**

```bash
git add src/visualizer/engine/vizStyles.ts src/visualizer/engine/palette.ts src/visualizer/engine/__tests__/vizStyles.test.ts
git commit -m "feat(mixtape): per-universe visualizer style table"
```

---

### Task 2: Shader dot styles and ParticleField.setUniverse

**Files:**
- Modify: `src/visualizer/engine/shaders/points.frag` (whole file), `src/visualizer/engine/shaders/points.vert` (uniform block + `main`)
- Modify: `src/visualizer/engine/ParticleField.ts` (uniforms, `setPalette` → `setUniverse`, `update`, `setReducedMotion`, new `snapshot`)
- Modify: `src/visualizer/VisualizerCanvas.tsx:53` (the `setPalette` effect)
- Modify: `src/visualizer/debug/DebugOverlay.tsx` only if it calls `setPalette` (grep first)
- Test: `src/visualizer/engine/__tests__/particleField.test.ts`

**Interfaces:**
- Consumes: `VIZ_STYLES`, `DOT_STYLE_INDEX`, `VizStyle` (Task 1); `paletteFor`.
- Produces: `ParticleField.setUniverse(u: Universe, instant?: boolean): void`; `ParticleField.snapshot(): { style: number; blending: THREE.Blending; palette: string[]; tweening: boolean }`. `setPalette` is removed.

- [ ] **Step 1: Write the failing test** — `src/visualizer/engine/__tests__/particleField.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { ParticleField } from '../ParticleField'
import { createSignal } from '../../signal/types'

const sig = () => createSignal()

describe('ParticleField.setUniverse', () => {
  it('applies the first universe instantly (no tween from verse)', () => {
    const f = new ParticleField(200)
    f.setUniverse('616', true)
    const s = f.snapshot()
    expect(s.tweening).toBe(false)
    expect(s.palette[0]).toBe('#c0392b')
    expect(s.style).toBe(0)
    expect(s.blending).toBe(THREE.NormalBlending)
  })

  it('tweens colours and switches style/blend at the midpoint', () => {
    const f = new ParticleField(200)
    f.setUniverse('verse', true)
    f.setUniverse('toon')
    expect(f.snapshot().tweening).toBe(true)
    f.update(sig(), 0.1)                       // 25 %: still verse style
    expect(f.snapshot().blending).toBe(THREE.AdditiveBlending)
    f.update(sig(), 0.15)                      // 62 %: style switched
    expect(f.snapshot().style).toBe(2)
    expect(f.snapshot().blending).toBe(THREE.NormalBlending)
    f.update(sig(), 0.5)                       // done
    const s = f.snapshot()
    expect(s.tweening).toBe(false)
    expect(s.palette).toEqual(['#ff3b3b', '#1f6feb', '#101010'])
  })

  it('switches instantly under reduced motion', () => {
    const f = new ParticleField(200, 1, true)
    f.setUniverse('mcu', true)
    f.setUniverse('616')
    expect(f.snapshot().tweening).toBe(false)
    expect(f.snapshot().palette[0]).toBe('#c0392b')
  })

  it('a second switch mid-tween retargets from the current blend', () => {
    const f = new ParticleField(200)
    f.setUniverse('verse', true)
    f.setUniverse('616')
    f.update(sig(), 0.2)
    f.setUniverse('mcu')
    f.update(sig(), 1)
    expect(f.snapshot().palette[0]).toBe('#7fb7ff')
    expect(f.snapshot().style).toBe(1)
  })
})
```

`createSignal()` (in `src/visualizer/signal/types.ts`) returns a fresh zeroed `AudioSignal`.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/visualizer/engine/__tests__/particleField.test.ts`
Expected: FAIL — `f.setUniverse is not a function`.

- [ ] **Step 3: Implement the shaders**

Replace `src/visualizer/engine/shaders/points.frag`:

```glsl
// Halftone dot, drawn per universe (spec §5): 0 ink on newsprint, 1 hologram,
// 2 flat cel with ink ring, 3 glitch (today's look; the split is CSS).
precision highp float;

uniform vec3 uPalette[3];
uniform float uBeat;
uniform int uStyle;
uniform vec3 uInk;
uniform float uTime;
uniform float uMotion;   // 1 normal, 0 reduced motion

varying float vSeed;
varying float vDepth;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c);
  if (r2 > 0.25) discard;
  int idx = int(floor(vSeed * 2.999));
  vec3 col = idx == 0 ? uPalette[0] : (idx == 1 ? uPalette[1] : uPalette[2]);
  float alpha;
  if (uStyle == 0) {
    // ink: hard opaque disc; depth fades toward the paper, not to glow
    alpha = mix(1.0, 0.55, vDepth);
  } else if (uStyle == 1) {
    // hologram: soft falloff, slow per-dot flicker, brightness pulse on beat
    float fall = 1.0 - smoothstep(0.0, 0.25, r2);
    float flick = 1.0 - uMotion * 0.25 * (0.5 + 0.5 * sin(uTime * 3.0 + vSeed * 40.0));
    col = mix(col, vec3(1.0), uBeat * 0.6);
    alpha = fall * flick * mix(0.9, 0.35, vDepth);
  } else if (uStyle == 2) {
    // cel: flat fill with an ink outline ring
    if (r2 > 0.16) col = uInk;
    alpha = 1.0;
  } else {
    // glitch: today's hard disc with a white core bloom on the beat
    float core = 1.0 - smoothstep(0.0, 0.25, r2);
    col = mix(col, vec3(1.0), uBeat * core * 0.8);
    alpha = mix(0.95, 0.45, vDepth);
  }
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
```

In `src/visualizer/engine/shaders/points.vert`, add below `uniform float uBreath;`:

```glsl
uniform float uBeat;
uniform int uStyle;      // see points.frag
```

and replace the body of `main()` from `p *= 1.0 + uBass * uBreath;` to the end with:

```glsl
  p *= 1.0 + uBass * uBreath;
  // cel: dots bounce outward on the beat (uBeat is already 0 under reduced motion)
  if (uStyle == 2) p *= 1.0 + uBeat * 0.12;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = uPointScale * (1.2 + uHighs * 1.5 + aSeed * 0.6);
  // ink: ±15 % size jitter by seed, swell on the beat; cel: fatter dots
  if (uStyle == 0) size *= (0.85 + aSeed * 0.3) * (1.0 + uBeat * 0.35);
  if (uStyle == 2) size *= 1.4;
  gl_PointSize = size / max(0.5, -mv.z);
  vSeed = aSeed;
  vDepth = clamp((-mv.z - 2.0) / 5.0, 0.0, 1.0);
}
```

- [ ] **Step 4: Implement ParticleField changes** — `src/visualizer/engine/ParticleField.ts`

Add imports:

```ts
import { VIZ_STYLES, DOT_STYLE_INDEX, type VizStyle } from './vizStyles'
```

Add below `const SMOOTH = …`:

```ts
const TWEEN_S = 0.4   // palette tween on a universe switch (spec §5)
```

Extend the uniform type with:

```ts
    uStyle: THREE.IUniform<number>
    uInk: THREE.IUniform<THREE.Color>
    uMotion: THREE.IUniform<number>
```

Add private state beside `private reduced = false`:

```ts
  private tween: { from: THREE.Color[]; to: THREE.Color[]; t: number; style: VizStyle; applied: boolean } | null = null
```

In the constructor's uniform object add:

```ts
      uStyle: { value: DOT_STYLE_INDEX.glitch },
      uInk: { value: new THREE.Color('#ffffff') },
      uMotion: { value: reducedMotion ? 0 : 1 },
```

Replace `setPalette(u)` with:

```ts
  // Universe switch (spec §5): colours tween over TWEEN_S; dot style and blend
  // mode flip at the midpoint. `instant` (first mount) and reduced motion skip
  // the tween so a fresh page never flashes verse first.
  setUniverse(u: Universe, instant = false): void {
    const style = VIZ_STYLES[u]
    const to = paletteFor(u)
    if (instant || this.reduced) {
      this.u.uPalette.value.forEach((c, i) => c.copy(to[i]))
      this.applyStyle(style)
      this.tween = null
      return
    }
    this.tween = { from: this.u.uPalette.value.map((c) => c.clone()), to, t: 0, style, applied: false }
  }

  private applyStyle(s: VizStyle): void {
    this.u.uStyle.value = DOT_STYLE_INDEX[s.dot]
    this.u.uInk.value.set(s.ink)
    this.material.blending = s.blend === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending
    this.material.needsUpdate = true
  }

  private stepTween(dt: number): void {
    const tw = this.tween
    if (!tw) return
    tw.t = Math.min(1, tw.t + dt / TWEEN_S)
    this.u.uPalette.value.forEach((c, i) => c.lerpColors(tw.from[i], tw.to[i], tw.t))
    if (!tw.applied && tw.t >= 0.5) { this.applyStyle(tw.style); tw.applied = true }
    if (tw.t >= 1) this.tween = null
  }

  snapshot(): { style: number; blending: THREE.Blending; palette: string[]; tweening: boolean } {
    return {
      style: this.u.uStyle.value,
      blending: this.material.blending,
      palette: this.u.uPalette.value.map((c) => '#' + c.getHexString()),
      tweening: this.tween !== null,
    }
  }
```

In `setReducedMotion(v)` add `this.u.uMotion.value = v ? 0 : 1`.

At the end of `update(sig, dt)` add `this.stepTween(dt)`.

A mid-tween `setUniverse` must start from the *current* colours: that is what `from: this.u.uPalette.value.map((c) => c.clone())` does, since `uPalette` holds the blended colours.

- [ ] **Step 5: Wire VisualizerCanvas** — `src/visualizer/VisualizerCanvas.tsx`

Replace `useEffect(() => field.setPalette(universe), [field, universe])` with:

```ts
  const firstUniverse = useRef(true)
  useEffect(() => {
    field.setUniverse(universe, firstUniverse.current)
    firstUniverse.current = false
  }, [field, universe])
```

Run `grep -rn "setPalette" src` — no results may remain.

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/visualizer`
Expected: PASS, including `particleField.test.ts` and `fallback.test.tsx`.

- [ ] **Step 7: Commit**

```bash
git add src/visualizer/engine src/visualizer/VisualizerCanvas.tsx
git commit -m "feat(mixtape): per-universe dot styles, blend mode and palette tween"
```

---

### Task 3: useDeckControls hook

**Files:**
- Create: `src/visualizer/ui/useDeckControls.ts`
- Test: `src/visualizer/ui/__tests__/useDeckControls.test.ts`

**Interfaces:**
- Consumes: `useMixtapeStore` (`currentIndex, isPlaying, progress, duration, shuffle, repeat, volume, toggle, next, prev, toggleShuffle, cycleRepeat, setVolume, seek`), `useDeckHide()` (`hidden, show, toggle`), `MIXTAPE_TRACKS`, `MOVIE_LABEL`, `MixtapeTrack`.
- Produces:

```ts
export type RepeatMode = 'off' | 'all' | 'one'
export interface DeckControls {
  track: MixtapeTrack
  movieLabel: string
  isPlaying: boolean
  progress: number
  duration: number
  pct: number              // 0–100
  shuffle: boolean
  repeat: RepeatMode
  repeatGlyph: string
  volume: number
  listOpen: boolean
  hidden: boolean
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (s: number) => void
  setVolume: (v: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  toggleList: () => void
  toggleHidden: () => void
  show: () => void
}
export function useDeckControls(): DeckControls
export function fmt(seconds: number): string
export function repeatGlyphFor(r: RepeatMode): string
```

- [ ] **Step 1: Write the failing test** — `src/visualizer/ui/__tests__/useDeckControls.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../../engine/mixtapeEngine', () => ({
  disposeMixtape: vi.fn(), loadMixtapeTrack: vi.fn(), pauseMixtape: vi.fn(), playMixtape: vi.fn(),
  seekMixtape: vi.fn(), setMixtapeCallbacks: vi.fn(), setMixtapeVolume: vi.fn(),
  getMixtapeDuration: () => 0, getCurrentSlug: () => null,
}))

import { useDeckControls, fmt, repeatGlyphFor } from '../useDeckControls'
import { useMixtapeStore } from '../../../store/mixtapeStore'
import { MIXTAPE_TRACKS, MOVIE_LABEL } from '../../../data/mixtape'

beforeEach(() => {
  useMixtapeStore.setState({ currentIndex: 0, progress: 30, duration: 120, deckHidden: false })
})

describe('useDeckControls', () => {
  it('exposes the current track and derived values', () => {
    const { result } = renderHook(() => useDeckControls())
    expect(result.current.track).toBe(MIXTAPE_TRACKS[0])
    expect(result.current.movieLabel).toBe(MOVIE_LABEL[MIXTAPE_TRACKS[0].movie])
    expect(result.current.pct).toBe(25)
  })

  it('forwards actions to the store', () => {
    const next = vi.fn()
    const seek = vi.fn()
    useMixtapeStore.setState({ next, seek })
    const { result } = renderHook(() => useDeckControls())
    result.current.next()
    result.current.seek(12)
    expect(next).toHaveBeenCalled()
    expect(seek).toHaveBeenCalledWith(12)
  })

  it('toggles the tracklist locally', () => {
    const { result } = renderHook(() => useDeckControls())
    expect(result.current.listOpen).toBe(false)
    act(() => result.current.toggleList())
    expect(result.current.listOpen).toBe(true)
  })

  it('pct is 0 when duration is unknown', () => {
    useMixtapeStore.setState({ duration: 0 })
    const { result } = renderHook(() => useDeckControls())
    expect(result.current.pct).toBe(0)
  })
})

describe('fmt / repeatGlyphFor', () => {
  it('formats seconds and guards bad input', () => {
    expect(fmt(65)).toBe('1:05')
    expect(fmt(NaN)).toBe('0:00')
    expect(fmt(-3)).toBe('0:00')
  })
  it('maps repeat modes to glyphs', () => {
    expect(repeatGlyphFor('off')).toBe('⤿')
    expect(repeatGlyphFor('all')).toBe('↻')
    expect(repeatGlyphFor('one')).toBe('↻¹')
  })
})
```

Before running, open `src/store/mixtapeStore.ts` and confirm the engine import list matches the mock (it imports `disposeMixtape, loadMixtapeTrack, pauseMixtape, playMixtape, seekMixtape, setMixtapeCallbacks, setMixtapeVolume, getMixtapeDuration, getCurrentSlug` from `../engine/mixtapeEngine`); add any missing name to the mock as `vi.fn()`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/visualizer/ui/__tests__/useDeckControls.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/visualizer/ui/useDeckControls.ts`

```ts
import { useState } from 'react'
import { useMixtapeStore } from '../../store/mixtapeStore'
import { MIXTAPE_TRACKS, MOVIE_LABEL, type MixtapeTrack } from '../../data/mixtape'
import { useDeckHide } from './useDeckHide'

// All deck behaviour in one place (spec §3.2). Faces are presentational and
// receive this object; they never touch the store themselves.

export type RepeatMode = 'off' | 'all' | 'one'

export interface DeckControls {
  track: MixtapeTrack
  movieLabel: string
  isPlaying: boolean
  progress: number
  duration: number
  pct: number
  shuffle: boolean
  repeat: RepeatMode
  repeatGlyph: string
  volume: number
  listOpen: boolean
  hidden: boolean
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (s: number) => void
  setVolume: (v: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  toggleList: () => void
  toggleHidden: () => void
  show: () => void
}

export function useDeckControls(): DeckControls {
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
  const seek = useMixtapeStore((s) => s.seek)
  const setVolume = useMixtapeStore((s) => s.setVolume)
  const toggleShuffle = useMixtapeStore((s) => s.toggleShuffle)
  const cycleRepeat = useMixtapeStore((s) => s.cycleRepeat)
  const { hidden, toggle: toggleHidden, show } = useDeckHide()
  const [listOpen, setListOpen] = useState(false)

  const track = MIXTAPE_TRACKS[currentIndex]
  return {
    track,
    movieLabel: MOVIE_LABEL[track.movie],
    isPlaying,
    progress,
    duration,
    pct: duration > 0 ? (progress / duration) * 100 : 0,
    shuffle,
    repeat,
    repeatGlyph: repeatGlyphFor(repeat),
    volume,
    listOpen,
    hidden,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    toggleList: () => setListOpen((o) => !o),
    toggleHidden,
    show,
  }
}

export function repeatGlyphFor(r: RepeatMode): string {
  return r === 'one' ? '↻¹' : r === 'all' ? '↻' : '⤿'
}

export function fmt(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
```

- [ ] **Step 4: Run tests** — `npx vitest run src/visualizer/ui` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/visualizer/ui/useDeckControls.ts src/visualizer/ui/__tests__/useDeckControls.test.ts
git commit -m "feat(mixtape): useDeckControls hook holds all deck behaviour"
```

---

### Task 4: Deck shell, shared control parts and the verse face

**Files:**
- Create: `src/visualizer/ui/faces/parts.tsx`, `src/visualizer/ui/faces/GlitchCassette.tsx`, `src/visualizer/ui/faces/index.ts`
- Create: `src/styles/faces/base.css`
- Modify: `src/visualizer/ui/Deck.tsx` (whole file)
- Create: `src/visualizer/ui/faces/__tests__/fakeControls.ts`, `src/visualizer/ui/faces/__tests__/faceContract.test.tsx`, `src/visualizer/ui/__tests__/Deck.test.tsx`

**Interfaces:**
- Consumes: `DeckControls`, `useDeckControls`, `fmt` (Task 3).
- Produces:
  - `FaceProps = { c: DeckControls }`, `type Face = (p: FaceProps) => JSX.Element` in `faces/index.ts`
  - `FACES: Record<Universe, Face>` and `FACE_IDS: Record<Universe, string>` in `faces/index.ts` (Task 4 maps all four universes to `GlitchCassette`; Tasks 5–7 replace their entries)
  - parts in `faces/parts.tsx`: `ScrubRange({ c, className? })`, `Times({ c, className? })`, `ShuffleButton`, `PrevButton`, `PlayButton`, `NextButton`, `RepeatButton`, `VolumeRange`, `ListButton`, `HideButton` — each `({ c: DeckControls; className?: string; children?: ReactNode })`
  - `Deck` renders `.viz-deck` with `data-face={FACE_IDS[shown]}`, `inert` + `aria-hidden` while hidden; each face root carries `data-face="<id>"`.

- [ ] **Step 1: Write the test helpers and failing tests**

`src/visualizer/ui/faces/__tests__/fakeControls.ts`:

```ts
import { vi } from 'vitest'
import type { DeckControls } from '../../useDeckControls'
import { MIXTAPE_TRACKS } from '../../../../data/mixtape'

export function fakeControls(over: Partial<DeckControls> = {}): DeckControls {
  return {
    track: MIXTAPE_TRACKS[0], movieLabel: 'Into the Spider-Verse', isPlaying: false,
    progress: 30, duration: 120, pct: 25, shuffle: false, repeat: 'off', repeatGlyph: '⤿',
    volume: 0.6, listOpen: false, hidden: false,
    toggle: vi.fn(), next: vi.fn(), prev: vi.fn(), seek: vi.fn(), setVolume: vi.fn(),
    toggleShuffle: vi.fn(), cycleRepeat: vi.fn(), toggleList: vi.fn(), toggleHidden: vi.fn(), show: vi.fn(),
    ...over,
  }
}
```

`src/visualizer/ui/faces/__tests__/faceContract.test.tsx` (Tasks 5–7 add their faces to `ALL`):

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { fakeControls } from './fakeControls'
import { GlitchCassette } from '../GlitchCassette'
import type { Face } from '../index'

const ALL: Array<[string, Face]> = [
  ['glitch-cassette', GlitchCassette],
]

describe.each(ALL)('%s face contract', (id, FaceC) => {
  it('renders every shared control with its accessible name', () => {
    render(<FaceC c={fakeControls()} />)
    for (const name of ['Track progress', 'Toggle shuffle', 'Previous track', 'Play', 'Next track',
      'Repeat: off', 'Volume', 'Toggle tracklist', 'Hide player (H)']) {
      expect(screen.getByLabelText(name)).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(fakeControls().track.title)
    expect(document.querySelector(`[data-face="${id}"]`)).not.toBeNull()
  })

  it('shows Pause while playing', () => {
    render(<FaceC c={fakeControls({ isPlaying: true })} />)
    expect(screen.getByLabelText('Pause')).toBeInTheDocument()
  })

  it('buttons and ranges call the controls', () => {
    const c = fakeControls()
    render(<FaceC c={c} />)
    fireEvent.click(screen.getByLabelText('Play'))
    fireEvent.click(screen.getByLabelText('Next track'))
    fireEvent.click(screen.getByLabelText('Previous track'))
    fireEvent.click(screen.getByLabelText('Toggle shuffle'))
    fireEvent.click(screen.getByLabelText('Repeat: off'))
    fireEvent.click(screen.getByLabelText('Toggle tracklist'))
    fireEvent.click(screen.getByLabelText('Hide player (H)'))
    fireEvent.change(screen.getByLabelText('Track progress'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '0.2' } })
    expect(c.toggle).toHaveBeenCalled()
    expect(c.next).toHaveBeenCalled()
    expect(c.prev).toHaveBeenCalled()
    expect(c.toggleShuffle).toHaveBeenCalled()
    expect(c.cycleRepeat).toHaveBeenCalled()
    expect(c.toggleList).toHaveBeenCalled()
    expect(c.toggleHidden).toHaveBeenCalled()
    expect(c.seek).toHaveBeenCalledWith(60)
    expect(c.setVolume).toHaveBeenCalledWith(0.2)
  })
})
```

`src/visualizer/ui/__tests__/Deck.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'

vi.mock('../../../engine/mixtapeEngine', () => ({
  disposeMixtape: vi.fn(), loadMixtapeTrack: vi.fn(), pauseMixtape: vi.fn(), playMixtape: vi.fn(),
  seekMixtape: vi.fn(), setMixtapeCallbacks: vi.fn(), setMixtapeVolume: vi.fn(),
  getMixtapeDuration: () => 0, getCurrentSlug: () => null,
}))
vi.mock('gsap', () => ({ default: { set: vi.fn(), to: vi.fn() } }))

import { Deck } from '../Deck'
import { FACE_IDS } from '../faces'
import { useUniverseStore } from '../../../store/universeStore'
import { useMixtapeStore } from '../../../store/mixtapeStore'

const face = () => document.querySelector('.viz-deck')?.getAttribute('data-face')

beforeEach(() => {
  useUniverseStore.setState({ activeUniverse: 'verse' })
  useMixtapeStore.setState({ deckHidden: false, isPlaying: false })
})

describe('Deck', () => {
  it('renders the face for the active universe', () => {
    render(<Deck />)
    expect(face()).toBe(FACE_IDS.verse)
  })

  it('swaps faces when the universe changes', async () => {
    render(<Deck />)
    act(() => useUniverseStore.setState({ activeUniverse: '616' }))
    await waitFor(() => expect(face()).toBe(FACE_IDS['616']))
  })

  it('two switches inside one fade window end on the last universe', async () => {
    render(<Deck />)
    act(() => useUniverseStore.setState({ activeUniverse: 'mcu' }))
    act(() => useUniverseStore.setState({ activeUniverse: 'toon' }))
    await waitFor(() => expect(face()).toBe(FACE_IDS.toon))
  })

  it('is inert while hidden, including after a universe switch', async () => {
    useMixtapeStore.setState({ deckHidden: true })
    render(<Deck />)
    const deck = () => document.querySelector('.viz-deck')!
    expect(deck().hasAttribute('inert')).toBe(true)
    act(() => useUniverseStore.setState({ activeUniverse: '616' }))
    await waitFor(() => expect(face()).toBe(FACE_IDS['616']))
    expect(deck().hasAttribute('inert')).toBe(true)
    expect(deck().getAttribute('aria-hidden')).toBe('true')
  })
})
```

In Task 4 every universe maps to the glitch cassette, so the three switch tests pass trivially on the attribute but still exercise the fade timing; they become meaningful in Tasks 5–7 without edits because they read `FACE_IDS`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/visualizer/ui`
Expected: FAIL — modules `../GlitchCassette`, `../faces` not found.

- [ ] **Step 3: Implement the parts** — `src/visualizer/ui/faces/parts.tsx`

```tsx
import type { CSSProperties, ReactNode } from 'react'
import { fmt, type DeckControls } from '../useDeckControls'

// Shared deck controls (spec §4.1). Every face composes these so the
// accessible names, focus order and wiring are identical in all four
// universes; faces only arrange and style them.

interface PartProps { c: DeckControls; className?: string; children?: ReactNode }

export function ScrubRange({ c, className = '' }: PartProps) {
  return (
    <input
      type="range" min={0} max={c.duration || 0} step={0.1} value={c.progress}
      onChange={(e) => c.seek(parseFloat(e.target.value))}
      aria-label="Track progress" className={className}
      style={{ '--mixtape-pct': `${c.pct}%` } as CSSProperties}
    />
  )
}

export function Times({ c, className = 'mixtape-now-time' }: PartProps) {
  return <div className={className}><span>{fmt(c.progress)}</span><span>{fmt(c.duration)}</span></div>
}

export function ShuffleButton({ c, className = '', children }: PartProps) {
  return <button type="button" onClick={c.toggleShuffle} className={`${className} ${c.shuffle ? 'is-active' : ''}`.trim()} aria-label="Toggle shuffle" aria-pressed={c.shuffle} data-spider-sense>{children ?? '⇌'}</button>
}

export function PrevButton({ c, className = '', children }: PartProps) {
  return <button type="button" onClick={c.prev} className={className} aria-label="Previous track" data-spider-sense>{children ?? '⏮'}</button>
}

export function PlayButton({ c, className = '', children }: PartProps) {
  return <button type="button" onClick={c.toggle} className={className} aria-label={c.isPlaying ? 'Pause' : 'Play'} data-spider-sense>{children ?? (c.isPlaying ? '⏸' : '▶')}</button>
}

export function NextButton({ c, className = '', children }: PartProps) {
  return <button type="button" onClick={c.next} className={className} aria-label="Next track" data-spider-sense>{children ?? '⏭'}</button>
}

export function RepeatButton({ c, className = '', children }: PartProps) {
  return <button type="button" onClick={c.cycleRepeat} className={`${className} ${c.repeat !== 'off' ? 'is-active' : ''}`.trim()} aria-label={`Repeat: ${c.repeat}`} data-spider-sense>{children ?? c.repeatGlyph}</button>
}

export function VolumeRange({ c, className = 'mixtape-volume' }: PartProps) {
  return (
    <label className={className}><span>VOL</span>
      <input type="range" min={0} max={1} step={0.01} value={c.volume} onChange={(e) => c.setVolume(parseFloat(e.target.value))} aria-label="Volume" />
    </label>
  )
}

export function ListButton({ c, className = '', children }: PartProps) {
  return <button type="button" onClick={c.toggleList} className={`${className} ${c.listOpen ? 'is-active' : ''}`.trim()} aria-label="Toggle tracklist" aria-expanded={c.listOpen} data-spider-sense>{children ?? '≡'}</button>
}

export function HideButton({ c, className = '', children }: PartProps) {
  return <button type="button" onClick={c.toggleHidden} className={className} aria-label="Hide player (H)" title="Hide (H)" data-spider-sense>{children ?? '⌄'}</button>
}
```

- [ ] **Step 4: Implement the verse face** — `src/visualizer/ui/faces/GlitchCassette.tsx`

Today's deck bar markup, now built from parts (existing `visualizer.css` / `mixtape.css` classes keep styling it):

```tsx
import type { FaceProps } from './index'
import { ScrubRange, Times, ShuffleButton, PrevButton, PlayButton, NextButton, RepeatButton, VolumeRange, ListButton, HideButton } from './parts'

// Verse: today's glitch cassette (spec §4.2), title with the red/cyan split.
export function GlitchCassette({ c }: FaceProps) {
  return (
    <div className="viz-deck-bar face-glitch" data-face="glitch-cassette">
      <div className="viz-reels" aria-hidden="true"><span className="viz-reel" /><span className="viz-reel" /></div>
      <div className="viz-deck-now">
        <p className="mixtape-now-movie">{c.movieLabel}</p>
        <h2 className="viz-deck-title">{c.track.title}</h2>
        <p className="viz-deck-artist">{c.track.artist}</p>
      </div>
      <div className="viz-deck-scrub"><ScrubRange c={c} /><Times c={c} /></div>
      <div className="viz-deck-transport">
        <ShuffleButton c={c} className="mixtape-control-btn" />
        <PrevButton c={c} className="mixtape-control-btn" />
        <PlayButton c={c} className="mixtape-control-play" />
        <NextButton c={c} className="mixtape-control-btn" />
        <RepeatButton c={c} className="mixtape-control-btn" />
        <VolumeRange c={c} />
        <ListButton c={c} className="mixtape-control-btn" />
        <HideButton c={c} className="mixtape-control-btn" />
      </div>
    </div>
  )
}
```

`src/visualizer/ui/faces/index.ts`:

```ts
import type { JSX } from 'react'
import type { Universe } from '../../../store/universeStore'
import type { DeckControls } from '../useDeckControls'
import { GlitchCassette } from './GlitchCassette'

export interface FaceProps { c: DeckControls }
export type Face = (p: FaceProps) => JSX.Element

// Universe → deck object (spec §4.2). Tasks 5–7 swap in the other faces.
export const FACES: Record<Universe, Face> = {
  '616': GlitchCassette,
  mcu: GlitchCassette,
  toon: GlitchCassette,
  verse: GlitchCassette,
}

export const FACE_IDS: Record<Universe, string> = {
  '616': 'glitch-cassette',
  mcu: 'glitch-cassette',
  toon: 'glitch-cassette',
  verse: 'glitch-cassette',
}
```

If `import type { JSX } from 'react'` fails type-checking in this React 19 setup, use `ReactElement` instead (`export type Face = (p: FaceProps) => ReactElement`).

`src/styles/faces/base.css`:

```css
/* Shared face plumbing: cross-fade on universe switch (spec §4.3) and a
 * visually-hidden utility (the MCU ring keeps its range for keyboard use). */
.viz-face { transform-origin: 50% 100%; }
.viz-face.is-entering { animation: viz-face-in 200ms ease both; }
.viz-face.is-leaving { animation: viz-face-out 200ms ease both; }
@keyframes viz-face-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: none; } }
@keyframes viz-face-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: scale(.96); } }
@media (prefers-reduced-motion: reduce) { .viz-face.is-entering, .viz-face.is-leaving { animation: none; } }

.face-sr {
  position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.face-sr:focus-visible { position: static !important; width: auto; height: auto; clip: auto; margin: 0; }
```

- [ ] **Step 5: Implement the shell** — replace `src/visualizer/ui/Deck.tsx`

```tsx
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useUniverseStore } from '../../store/universeStore'
import { prefersReducedMotion } from '../../engine/motion'
import { useDeckControls } from './useDeckControls'
import { Tracklist } from './Tracklist'
import { FACES, FACE_IDS } from './faces'
import '../../styles/faces/base.css'

// Deck shell (spec §3.2): picks the face for the active universe, cross-fades
// on a switch, slides out when hidden (inert while hidden) and keeps the
// tracklist. All behaviour lives in useDeckControls; faces only draw it.

const FADE_MS = 200

export function Deck() {
  const universe = useUniverseStore((s) => s.activeUniverse)
  const c = useDeckControls()
  const rootRef = useRef<HTMLDivElement>(null)
  const reduced = prefersReducedMotion()

  // Render-phase adjust (no setState in effects): mark the current face as
  // leaving; the timer below mounts whatever the universe is when it fires,
  // so a second switch mid-fade simply lands on the latest universe.
  const [shown, setShown] = useState(universe)
  const [leaving, setLeaving] = useState(false)
  if (universe !== shown && !leaving) {
    if (reduced) setShown(universe)
    else setLeaving(true)
  }
  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(() => { setShown(universe); setLeaving(false) }, FADE_MS)
    return () => window.clearTimeout(t)
  }, [leaving, universe])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (reduced) { gsap.set(el, { y: c.hidden ? '100%' : '0%' }); return }
    gsap.to(el, { y: c.hidden ? '100%' : '0%', duration: 0.35, ease: 'power3.inOut', overwrite: true })
  }, [c.hidden, reduced])

  // Publish the deck height so the page index can sit above it (spec §6).
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => {
      el.parentElement?.style.setProperty('--deck-h', `${Math.round(e.contentRect.height)}px`)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const FaceC = FACES[shown]
  return (
    <>
      {c.hidden && <button type="button" className="viz-deck-reveal" aria-label="Show player" onClick={c.show} />}
      <div
        ref={rootRef}
        className={`viz-deck ${c.isPlaying ? 'is-playing' : ''}`}
        data-face={FACE_IDS[shown]}
        aria-label="Mixtape deck"
        aria-hidden={c.hidden || undefined}
        inert={c.hidden || undefined}
      >
        <Tracklist open={c.listOpen} />
        <div key={shown} className={`viz-face ${leaving ? 'is-leaving' : 'is-entering'}`}>
          <FaceC c={c} />
        </div>
      </div>
    </>
  )
}
```

If TypeScript rejects `inert={…}` on a `div` (React 19 types accept `inert?: boolean`), keep the boolean form above; do not use the string `''`.

- [ ] **Step 6: Run tests** — `npx vitest run src/visualizer` → PASS (face contract, Deck, fallback).

- [ ] **Step 7: Commit**

```bash
git add src/visualizer/ui src/styles/faces/base.css
git commit -m "feat(mixtape): deck shell with face registry, shared control parts, verse glitch face"
```

---

### Task 5: 616 face — Inked Cassette

**Files:**
- Create: `src/visualizer/ui/faces/InkedCassette.tsx`, `src/styles/faces/inked.css`
- Modify: `src/visualizer/ui/faces/index.ts` (`'616'` entries), `src/visualizer/ui/faces/__tests__/faceContract.test.tsx` (`ALL`)

**Interfaces:** Consumes `FaceProps` and parts (Task 4). Produces `InkedCassette: Face`, face id `inked-cassette`.

- [ ] **Step 1: Add to the contract test** — in `faceContract.test.tsx` import `InkedCassette` from `../InkedCassette` and add `['inked-cassette', InkedCassette]` to `ALL`.

- [ ] **Step 2: Run** `npx vitest run src/visualizer/ui/faces` → FAIL (module not found).

- [ ] **Step 3: Implement** — `src/visualizer/ui/faces/InkedCassette.tsx`

```tsx
import type { FaceProps } from './index'
import { ScrubRange, Times, ShuffleButton, PrevButton, PlayButton, NextButton, RepeatButton, VolumeRange, ListButton, HideButton } from './parts'
import '../../../styles/faces/inked.css'

// 616: an inked cassette shell with a hand-lettered paper label (spec §4.2).
export function InkedCassette({ c }: FaceProps) {
  return (
    <div className="face-inked" data-face="inked-cassette">
      <div className="inked-shell">
        <span className="inked-reel" aria-hidden="true" />
        <div className="inked-label">
          <p className="inked-movie">{c.movieLabel}</p>
          <h2 className="inked-title">{c.track.title}</h2>
          <p className="inked-artist">{c.track.artist} <span className="inked-side">· SIDE A</span></p>
        </div>
        <span className="inked-reel" aria-hidden="true" />
      </div>
      <div className="inked-tape"><ScrubRange c={c} className="inked-scrub" /><Times c={c} className="inked-times" /></div>
      <div className="inked-transport">
        <ShuffleButton c={c} className="inked-btn" />
        <PrevButton c={c} className="inked-btn" />
        <PlayButton c={c} className="inked-play" />
        <NextButton c={c} className="inked-btn" />
        <RepeatButton c={c} className="inked-btn" />
        <VolumeRange c={c} className="inked-volume" />
        <ListButton c={c} className="inked-btn" />
        <HideButton c={c} className="inked-btn" />
      </div>
    </div>
  )
}
```

`src/styles/faces/inked.css`:

```css
/* 616 · Inked Cassette (spec §4.2): cream shell, 3px ink, hard offset shadow. */
.viz-deck[data-face='inked-cassette'] { background: transparent; border-top: 0; backdrop-filter: none; }
.face-inked {
  display: flex; align-items: center; gap: 16px; margin: 0 16px 14px; padding: 10px 14px;
  background: #fffdf5; color: #1b1b1b; border: 3px solid #1b1b1b; box-shadow: 4px 4px 0 #1b1b1b;
  font-family: 'Share Tech Mono', ui-monospace, monospace;
}
.inked-shell { display: flex; align-items: center; gap: 10px; flex: none; }
.inked-reel {
  width: 30px; height: 30px; border-radius: 50%; border: 3px solid #1b1b1b; flex: none;
  background: repeating-conic-gradient(#1b1b1b 0 20deg, #fffdf5 0 60deg);
}
.viz-deck.is-playing .inked-reel { animation: viz-spin 1.6s linear infinite; }
.inked-label { background: #fffdf5; border: 2px solid #1b1b1b; padding: 4px 10px; transform: rotate(-1.5deg); min-width: 150px; }
.inked-movie { margin: 0; font-size: 9px; letter-spacing: .15em; text-transform: uppercase; }
.inked-title { margin: 2px 0; font: 20px/1 'Bangers', cursive; letter-spacing: .04em; color: #c0392b; }
.inked-artist { margin: 0; font-size: 11px; opacity: .8; }
.inked-tape { flex: 1; min-width: 120px; }
.inked-scrub { width: 100%; accent-color: #c0392b; }
.inked-times { display: flex; justify-content: space-between; font-size: 10px; }
.inked-transport { display: flex; align-items: center; gap: 6px; }
.inked-btn {
  width: 30px; height: 30px; display: grid; place-items: center; background: #fffdf5; color: #1b1b1b;
  border: 2px solid #1b1b1b; box-shadow: 2px 2px 0 #1b1b1b; cursor: pointer; font-size: 13px;
}
.inked-btn.is-active { background: #ffd400; }
.inked-play {
  width: 44px; height: 44px; border-radius: 50%; background: #ffd400; color: #1b1b1b;
  border: 3px solid #1b1b1b; box-shadow: 2px 2px 0 #1b1b1b; cursor: pointer; font-size: 16px;
  transform: scale(calc(1 + var(--beat, 0) * .06));
}
.inked-volume { display: flex; align-items: center; gap: 4px; font-size: 9px; }
.inked-volume input { width: 70px; accent-color: #1b1b1b; }
@media (prefers-reduced-motion: reduce) { .viz-deck.is-playing .inked-reel { animation: none; } .inked-play { transform: none; } }
@media (max-width: 767px) {
  .face-inked { flex-wrap: wrap; gap: 8px; margin: 0 8px 8px; }
  .inked-shell, .inked-tape { flex: 1 1 100%; }
  .inked-transport { flex: 1 1 100%; justify-content: space-between; }
  .inked-side, .inked-volume { display: none; }
}
```

In `faces/index.ts`: import `InkedCassette`; set `FACES['616'] = InkedCassette` and `FACE_IDS['616'] = 'inked-cassette'` (edit the object literals).

- [ ] **Step 4: Run** `npx vitest run src/visualizer/ui` → PASS (contract ×2, Deck switch tests now see `inked-cassette`).

- [ ] **Step 5: Commit** — `git add src/visualizer/ui/faces src/styles/faces/inked.css && git commit -m "feat(mixtape): 616 inked cassette deck face"`

---

### Task 6: MCU face — HUD Ring

**Files:**
- Create: `src/visualizer/ui/faces/HudRing.tsx`, `src/visualizer/ui/faces/arc.ts`, `src/styles/faces/hud.css`
- Modify: `src/visualizer/ui/faces/index.ts` (`mcu` entries), `faceContract.test.tsx` (`ALL`)
- Test: `src/visualizer/ui/faces/__tests__/arc.test.ts`, plus a HUD-specific block in `faceContract.test.tsx`

**Interfaces:** Produces `arcToTime(x: number, y: number, cx: number, cy: number, duration: number): number`, `HudRing: Face`, face id `hud-ring`.

- [ ] **Step 1: Write failing tests**

`src/visualizer/ui/faces/__tests__/arc.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { arcToTime } from '../arc'

// Clockwise from 12 o'clock around (50, 50), duration 100 s.
describe('arcToTime', () => {
  it('maps the four compass points', () => {
    expect(arcToTime(50, 0, 50, 50, 100)).toBeCloseTo(0)
    expect(arcToTime(100, 50, 50, 50, 100)).toBeCloseTo(25)
    expect(arcToTime(50, 100, 50, 50, 100)).toBeCloseTo(50)
    expect(arcToTime(0, 50, 50, 50, 100)).toBeCloseTo(75)
  })
  it('returns 0 when duration is unknown', () => {
    expect(arcToTime(100, 50, 50, 50, 0)).toBe(0)
  })
})
```

In `faceContract.test.tsx`: import `HudRing` from `../HudRing`, add `['hud-ring', HudRing]` to `ALL`, and append:

```tsx
describe('HudRing keyboard seeking', () => {
  it('keeps a focusable Track progress range even though the arc is the visible control', () => {
    const c = fakeControls()
    render(<HudRing c={c} />)
    const range = screen.getByLabelText('Track progress')
    expect(range.tagName).toBe('INPUT')
    expect(range).not.toHaveAttribute('tabindex', '-1')
    fireEvent.change(range, { target: { value: '90' } })
    expect(c.seek).toHaveBeenCalledWith(90)
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/visualizer/ui/faces` → FAIL.

- [ ] **Step 3: Implement** — `src/visualizer/ui/faces/arc.ts`

```ts
// Pointer position on the MCU progress ring → playback time. Angle runs
// clockwise from 12 o'clock, so the top is 0 and a full turn is `duration`.
export function arcToTime(x: number, y: number, cx: number, cy: number, duration: number): number {
  if (!(duration > 0)) return 0
  let a = Math.atan2(x - cx, cy - y)
  if (a < 0) a += Math.PI * 2
  return (a / (Math.PI * 2)) * duration
}
```

`src/visualizer/ui/faces/HudRing.tsx`:

```tsx
import { useRef } from 'react'
import type { PointerEvent } from 'react'
import type { FaceProps } from './index'
import { arcToTime } from './arc'
import { ScrubRange, Times, ShuffleButton, PrevButton, PlayButton, NextButton, RepeatButton, VolumeRange, ListButton, HideButton } from './parts'
import '../../../styles/faces/hud.css'

const R = 26
const CIRC = 2 * Math.PI * R

// MCU: Stark HUD ring (spec §4.2). The outer arc is progress and seeks by
// pointer; the Track progress range stays in the DOM (visually hidden) as
// the keyboard / screen-reader control.
export function HudRing({ c }: FaceProps) {
  const dragging = useRef(false)
  const seekAt = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    c.seek(arcToTime(e.clientX, e.clientY, r.left + r.width / 2, r.top + r.height / 2, c.duration))
  }
  return (
    <div className="face-hud" data-face="hud-ring">
      <div className="hud-ring">
        <svg
          viewBox="0 0 64 64" className="hud-arc" aria-hidden="true"
          onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); seekAt(e) }}
          onPointerMove={(e) => { if (dragging.current) seekAt(e) }}
          onPointerUp={() => { dragging.current = false }}
        >
          <circle cx="32" cy="32" r={R} className="hud-arc-track" />
          <circle cx="32" cy="32" r={R} className="hud-arc-fill" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - c.pct / 100)} transform="rotate(-90 32 32)" />
        </svg>
        <PlayButton c={c} className="hud-play" />
      </div>
      <div className="hud-now">
        <p className="hud-readout">F.R.I.D.A.Y. // AUDIO · {c.movieLabel}</p>
        <h2 className="hud-title">{c.track.title}</h2>
        <p className="hud-artist">{c.track.artist}</p>
        <ScrubRange c={c} className="face-sr" />
        <Times c={c} className="hud-times" />
      </div>
      <div className="hud-transport">
        <ShuffleButton c={c} className="hud-btn" />
        <PrevButton c={c} className="hud-btn" />
        <NextButton c={c} className="hud-btn" />
        <RepeatButton c={c} className="hud-btn" />
        <VolumeRange c={c} className="hud-volume" />
        <ListButton c={c} className="hud-btn" />
        <HideButton c={c} className="hud-btn" />
      </div>
    </div>
  )
}
```

`src/styles/faces/hud.css`:

```css
/* MCU · HUD Ring (spec §4.2): navy glass, thin blue lines, hex buttons. */
.viz-deck[data-face='hud-ring'] {
  background: rgba(10, 22, 40, .85); border-top: 1px solid rgba(127, 183, 255, .6);
  box-shadow: 0 -8px 30px rgba(127, 183, 255, .12);
}
.viz-deck[data-face='hud-ring']::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(127, 183, 255, .06) 0 1px, transparent 1px 3px);
}
.face-hud { display: flex; align-items: center; gap: 18px; padding: 10px 18px; color: #e6f1ff; font-family: 'Rajdhani', sans-serif; }
.hud-ring { position: relative; width: 72px; height: 72px; flex: none; }
.hud-arc { width: 100%; height: 100%; cursor: pointer; touch-action: none; }
.hud-arc-track { fill: none; stroke: rgba(127, 183, 255, .2); stroke-width: 3; }
.hud-arc-fill { fill: none; stroke: #7fb7ff; stroke-width: 3; filter: drop-shadow(0 0 3px #7fb7ff); }
.hud-play {
  position: absolute; left: 50%; top: 50%; width: 38px; height: 38px; transform: translate(-50%, -50%);
  clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
  background: rgba(255, 45, 45, calc(.14 + var(--beat, 0) * .3)); color: #ff2d2d; border: 0; cursor: pointer; font-size: 14px;
}
.hud-now { flex: 1; min-width: 0; }
.hud-readout { margin: 0; font-size: 10px; letter-spacing: .2em; color: #7fb7ff; text-transform: uppercase; }
.hud-title { margin: 2px 0; font-size: 16px; font-weight: 700; letter-spacing: .25em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hud-artist { margin: 0; font-size: 12px; opacity: .75; }
.hud-times { display: flex; gap: 10px; font-size: 11px; color: #7fb7ff; }
.hud-transport { display: flex; align-items: center; gap: 6px; }
.hud-btn {
  width: 32px; height: 28px; clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
  background: rgba(127, 183, 255, .14); color: #e6f1ff; border: 0; cursor: pointer; font-size: 12px;
}
.hud-btn.is-active { background: rgba(255, 45, 45, .35); color: #fff; }
.hud-volume { display: flex; align-items: center; gap: 4px; font-size: 10px; letter-spacing: .15em; color: #7fb7ff; }
.hud-volume input { width: 70px; accent-color: #7fb7ff; }
@media (prefers-reduced-motion: reduce) { .hud-play { background: rgba(255, 45, 45, .14); } }
@media (max-width: 767px) {
  .face-hud { flex-wrap: wrap; gap: 8px; padding: 8px 12px; }
  .hud-ring { width: 56px; height: 56px; }
  .hud-now { flex: 1 1 60%; }
  .hud-transport { flex: 1 1 100%; justify-content: space-between; }
  .hud-volume { display: none; }
}
```

Register in `faces/index.ts`: `mcu: HudRing` / `mcu: 'hud-ring'`.

- [ ] **Step 4: Run** `npx vitest run src/visualizer/ui` → PASS.

- [ ] **Step 5: Commit** — `git add src/visualizer/ui/faces src/styles/faces/hud.css && git commit -m "feat(mixtape): MCU HUD ring deck face with arc seeking"`

---

### Task 7: Toon face — Boombox

**Files:**
- Create: `src/visualizer/ui/faces/Boombox.tsx`, `src/styles/faces/boombox.css`
- Modify: `faces/index.ts` (`toon` entries), `faceContract.test.tsx` (`ALL`)

**Interfaces:** Produces `Boombox: Face`, face id `boombox`. Speaker pump reads the `--beat` CSS variable (written by Task 9 on `.viz-page`); no JS subscription.

- [ ] **Step 1:** add `['boombox', Boombox]` to `ALL` (import from `../Boombox`).
- [ ] **Step 2:** `npx vitest run src/visualizer/ui/faces` → FAIL.
- [ ] **Step 3: Implement** — `src/visualizer/ui/faces/Boombox.tsx`

```tsx
import type { FaceProps } from './index'
import { ScrubRange, Times, ShuffleButton, PrevButton, PlayButton, NextButton, RepeatButton, VolumeRange, ListButton, HideButton } from './parts'
import '../../../styles/faces/boombox.css'

// Toon: a chunky Saturday-morning boombox (spec §4.2). Speaker cones pump
// with the page's --beat variable.
export function Boombox({ c }: FaceProps) {
  return (
    <div className="face-boombox" data-face="boombox">
      <span className="boom-speaker" aria-hidden="true" />
      <div className="boom-body">
        <p className="boom-movie">{c.movieLabel}</p>
        <h2 className="boom-title">{c.track.title}</h2>
        <p className="boom-artist">{c.track.artist}</p>
        <ScrubRange c={c} className="boom-scrub" />
        <Times c={c} className="boom-times" />
      </div>
      <div className="boom-transport">
        <ShuffleButton c={c} className="boom-btn" />
        <PrevButton c={c} className="boom-btn" />
        <PlayButton c={c} className="boom-play" />
        <NextButton c={c} className="boom-btn" />
        <RepeatButton c={c} className="boom-btn" />
        <VolumeRange c={c} className="boom-volume" />
        <ListButton c={c} className="boom-btn" />
        <HideButton c={c} className="boom-btn" />
      </div>
      <span className="boom-speaker boom-speaker-r" aria-hidden="true" />
    </div>
  )
}
```

`src/styles/faces/boombox.css`:

```css
/* Toon · Boombox (spec §4.2): white body, 4px black outline, bold shadow. */
.viz-deck[data-face='boombox'] { background: transparent; border-top: 0; backdrop-filter: none; }
.face-boombox {
  display: flex; align-items: center; gap: 14px; margin: 0 16px 14px; padding: 10px 16px;
  background: #fff; color: #101010; border: 4px solid #101010; border-radius: 18px; box-shadow: 6px 6px 0 #101010;
  font-family: 'Share Tech Mono', ui-monospace, monospace;
}
.boom-speaker {
  width: 54px; height: 54px; flex: none; border-radius: 50%; border: 4px solid #101010;
  background: radial-gradient(circle, #101010 0 18%, #1f6feb 19% 62%, #101010 63% 68%, #1f6feb 69%);
  transform: scale(calc(1 + var(--beat, 0) * .12));
}
.boom-body { flex: 1; min-width: 0; }
.boom-movie { margin: 0; font-size: 9px; letter-spacing: .15em; text-transform: uppercase; }
.boom-title { margin: 2px 0; font: 20px/1 'Luckiest Guy', cursive; color: #ff3b3b; -webkit-text-stroke: 1px #101010; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.boom-artist { margin: 0 0 4px; font-size: 11px; }
.boom-scrub { width: 100%; height: 10px; accent-color: #ff3b3b; }
.boom-times { display: flex; justify-content: space-between; font-size: 10px; }
.boom-transport { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; max-width: 330px; }
.boom-btn { width: 32px; height: 32px; border-radius: 50%; background: #fff; border: 3px solid #101010; color: #101010; cursor: pointer; font-size: 12px; }
.boom-btn.is-active { background: #ffe14d; }
.boom-play { width: 48px; height: 48px; border-radius: 50%; background: #ff3b3b; color: #fff; border: 4px solid #101010; cursor: pointer; font-size: 18px; }
.boom-volume { display: flex; align-items: center; gap: 4px; font-size: 9px; }
.boom-volume input { width: 64px; accent-color: #101010; }
@media (prefers-reduced-motion: reduce) { .boom-speaker { transform: none; } }
@media (max-width: 767px) {
  .face-boombox { flex-wrap: wrap; gap: 8px; margin: 0 8px 8px; padding: 8px 12px; }
  .boom-speaker { width: 42px; height: 42px; }
  .boom-speaker-r, .boom-volume { display: none; }
  .boom-transport { flex: 1 1 100%; max-width: none; justify-content: space-between; }
}
```

Register: `toon: Boombox` / `toon: 'boombox'`.

- [ ] **Step 4:** `npx vitest run src/visualizer/ui` → PASS.
- [ ] **Step 5: Commit** — `git add src/visualizer/ui/faces src/styles/faces/boombox.css && git commit -m "feat(mixtape): toon boombox deck face"`

---

### Task 8: Page index `onSelect`, its own stylesheet, and the home `#u-` hash

**Files:**
- Modify: `src/comic/PageIndex.tsx` (signature, key handler, click, CSS import)
- Create: `src/styles/page-index.css` (lines 161–169 of `src/styles/comic.css`, moved)
- Modify: `src/styles/comic.css` (delete those lines)
- Modify: `src/pages/Home.tsx` (hash effect)
- Test: `src/comic/__tests__/PageIndex.test.tsx` (add cases), `src/pages/__tests__/homeChrome.test.tsx` (add a case)

**Interfaces:**
- Produces: `PageIndex(props?: { onSelect?: (u: Universe) => void })`; default behaviour unchanged (`scrollToUniverse`).
- `Home` reads `useLocation().hash`; `#u-<id>` with a known id → `setUniverse(id)` and scroll `#u-<id>` into view.

- [ ] **Step 1: Write failing tests**

Append to `src/comic/__tests__/PageIndex.test.tsx` (inside the existing `describe`; `vi` and `useUniverseStore` imports added at the top if missing):

```tsx
  it('calls onSelect instead of scrolling when given one (click and arrow keys)', () => {
    const onSelect = vi.fn()
    useUniverseStore.setState({ activeUniverse: '616' })
    render(<PageIndex onSelect={onSelect} />)
    fireEvent.click(screen.getAllByRole('button').find((b) => b.textContent?.includes('p.3'))!)
    expect(onSelect).toHaveBeenLastCalledWith('toon')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenLastCalledWith('mcu')
  })
```

Append to `src/pages/__tests__/homeChrome.test.tsx` (inside `describe('Home chrome')`):

```tsx
  it('a #u-<id> hash selects that universe on load', async () => {
    useUniverseStore.setState({ activeUniverse: '616' })
    render(<MemoryRouter initialEntries={['/#u-toon']}><Home /></MemoryRouter>)
    await waitFor(() => expect(useUniverseStore.getState().activeUniverse).toBe('toon'))
  })

  it('ignores an unknown hash', () => {
    useUniverseStore.setState({ activeUniverse: '616' })
    render(<MemoryRouter initialEntries={['/#u-nope']}><Home /></MemoryRouter>)
    expect(useUniverseStore.getState().activeUniverse).toBe('616')
  })
```

`Element.prototype.scrollIntoView` does not exist in jsdom: add `Element.prototype.scrollIntoView = vi.fn()` at the top of `homeChrome.test.tsx` if it is not already stubbed.

- [ ] **Step 2:** `npx vitest run src/comic src/pages` → FAIL on the new cases.

- [ ] **Step 3: Implement `PageIndex`** — in `src/comic/PageIndex.tsx`:

Add imports `import { useRef } from 'react'` (merge with the existing react import), `import type { Universe } from '../store/universeStore'`, and `import '../styles/page-index.css'`.

Change the component head and handlers:

```tsx
export function PageIndex({ onSelect = scrollToUniverse }: { onSelect?: (u: Universe) => void } = {}) {
  const active = useUniverseStore((s) => s.activeUniverse)
  const [open, setOpen] = useState(false)
  const select = useRef(onSelect)
  useEffect(() => { select.current = onSelect })
```

In the keydown handler replace both `scrollToUniverse(…)` calls with `select.current(…)`. In the fan button replace `scrollToUniverse(id)` with `onSelect(id)`.

Move the `.page-index…` rules (current `src/styles/comic.css` lines 161–169, the block from `.page-index {` through the `@media (max-width: 767px) { .page-index …}` line) verbatim into `src/styles/page-index.css`, changing only `left: calc(var(--bugle-w) + 16px)` to `left: calc(var(--bugle-w, 0px) + 16px)`. Delete them from `comic.css`. Run `grep -n "page-index" src/styles/comic.css` — no output expected.

- [ ] **Step 4: Implement the hash** — in `src/pages/Home.tsx`:

Add `import { useLocation } from 'react-router-dom'`, and add `UNIVERSE_IDS` and `type Universe` to the `universeStore` import. Inside `Home()` after `const active = …`:

```tsx
  // Coming back from /mixtape ("/#u-toon") lands on that universe's page.
  const { hash } = useLocation()
  useEffect(() => {
    const id = hash.startsWith('#u-') ? hash.slice(3) : ''
    if (!(UNIVERSE_IDS as readonly string[]).includes(id)) return
    const u = id as Universe
    useUniverseStore.getState().setUniverse(u)
    const raf = requestAnimationFrame(() => document.getElementById(`u-${u}`)?.scrollIntoView({ block: 'start' }))
    return () => cancelAnimationFrame(raf)
  }, [hash])
```

- [ ] **Step 5:** `npx vitest run` → PASS (all files).
- [ ] **Step 6: Commit** — `git add src/comic src/styles/page-index.css src/styles/comic.css src/pages && git commit -m "feat(comic): page index accepts onSelect and ships its own CSS; home honours #u- hashes"`

---

### Task 9: The /mixtape page — universe, backdrops, chrome, beat, verse split

**Files:**
- Create: `src/visualizer/ui/useBeatVar.ts`, `src/styles/mixtape-universe.css`
- Modify: `src/visualizer/frameGuard.ts` (add `guardStep`), `src/visualizer/VisualizerCanvas.tsx` (use `guardStep`, `onDegrade` prop)
- Modify: `src/pages/Mixtape.tsx` (whole component body)
- Modify: `src/styles/visualizer.css` (`.viz-canvas` / `.viz-fallback` backgrounds → transparent; phone chrome)
- Modify: `src/styles/mixtape.css` (delete dead page rules — Step 6)
- Test: `src/visualizer/__tests__/frameGuard.test.ts` (add), `src/visualizer/ui/__tests__/useBeatVar.test.ts`, `src/pages/__tests__/mixtapeUniverse.test.tsx`

**Interfaces:**
- Produces: `guardStep(g: GuardState, dt: number): { next: GuardState; action: 'halve' | 'degrade' | null }` with `GuardState = { over: number; trips: number }`; `VisualizerCanvasProps.onDegrade?: () => void`; `useBeatVar(ref: RefObject<HTMLElement | null>, signal: AudioSignal): void`.
- Consumes: `PageIndex({ onSelect })` (Task 8), `Deck` (Task 4), `ParticleField.setUniverse` (Task 2).

- [ ] **Step 1: Write failing tests**

Append to `src/visualizer/__tests__/frameGuard.test.ts`:

```ts
import { guardStep } from '../frameGuard'

describe('guardStep', () => {
  const slow = (g: { over: number; trips: number }, secs: number) => {
    let s = g; let action: string | null = null
    for (let t = 0; t < secs; t += 0.03) { const r = guardStep(s, 0.03); s = r.next; action = r.action ?? action }
    return { s, action }
  }
  it('halves on the first sustained slowdown, degrades on the second, then stops', () => {
    const a = slow({ over: 0, trips: 0 }, 2.1)
    expect(a.action).toBe('halve')
    const b = slow(a.s, 2.1)
    expect(b.action).toBe('degrade')
    const c = slow(b.s, 2.1)
    expect(c.action).toBe(null)
  })
  it('a stall resets instead of counting', () => {
    expect(guardStep({ over: 1.9, trips: 0 }, 3).next.over).toBe(0)
  })
})
```

(If the file's existing top-level imports already include `describe/it/expect`, don't duplicate them.)

`src/visualizer/ui/__tests__/useBeatVar.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBeatVar } from '../useBeatVar'
import { createSignal } from '../../signal/types'

let frames: FrameRequestCallback[] = []
beforeEach(() => {
  frames = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.push(cb); return frames.length })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())

describe('useBeatVar', () => {
  it('writes the signal beat to --beat once per frame', () => {
    const el = document.createElement('div')
    const signal = createSignal()
    renderHook(() => useBeatVar({ current: el }, signal))
    signal.beat = 0.8
    frames.shift()!(0)
    expect(el.style.getPropertyValue('--beat')).toBe('0.800')
  })
})
```

`src/pages/__tests__/mixtapeUniverse.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useUniverseStore } from '../../store/universeStore'

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'unavailable' })))
})

import { Mixtape } from '../Mixtape'

const page = () => document.querySelector('main.viz-page')!

describe('/mixtape universe', () => {
  it('opens in the store universe, not forced to verse', () => {
    useUniverseStore.setState({ activeUniverse: '616' })
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    expect(page().getAttribute('data-universe')).toBe('616')
    expect(useUniverseStore.getState().activeUniverse).toBe('616')
  })

  it('follows the store when the universe changes', () => {
    useUniverseStore.setState({ activeUniverse: 'mcu' })
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    act(() => useUniverseStore.getState().setUniverse('toon'))
    expect(page().getAttribute('data-universe')).toBe('toon')
  })

  it('back link returns to that universe on the comic', () => {
    useUniverseStore.setState({ activeUniverse: 'mcu' })
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /back/i }).getAttribute('href')).toBe('/#u-mcu')
  })

  it('renders the page index for switching', () => {
    useUniverseStore.setState({ activeUniverse: 'verse' })
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    expect(screen.getByText(/p\.4\/4/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2:** `npx vitest run src/visualizer src/pages` → FAIL on the new cases.

- [ ] **Step 3: Implement `guardStep`** — append to `src/visualizer/frameGuard.ts`:

```ts
// Two-stage guard (mixtape spec §5): the first sustained slowdown halves N;
// if frames stay slow, the second asks the page to drop the costly verse
// canvas filter. After that the guard stops watching.
export interface GuardState { over: number; trips: number }

export function guardStep(g: GuardState, dt: number): { next: GuardState; action: 'halve' | 'degrade' | null } {
  if (g.trips >= 2) return { next: g, action: null }
  const over = nextOver(g.over, dt)
  if (over < 2) return { next: { over, trips: g.trips }, action: null }
  const trips = g.trips + 1
  return { next: { over: 0, trips }, action: trips === 1 ? 'halve' : 'degrade' }
}
```

In `src/visualizer/VisualizerCanvas.tsx`:
- add `onDegrade?: () => void` to `VisualizerCanvasProps` (comment: `// frames still slow after the halve (verse drops its CSS split)`);
- `Field` destructures `onDegrade`; replace `const slow = useRef({ over: 0, halved: false })` with `const guard = useRef<GuardState>({ over: 0, trips: 0 })` and import `guardStep, type GuardState` (drop the `nextOver` import if unused);
- replace the guard block in `useFrame` with:

```ts
    const { next, action } = guardStep(guard.current, dt)
    guard.current = next
    if (action === 'halve') { field.halve(); force((x) => x + 1) }
    if (action === 'degrade') onDegrade?.()
```

- [ ] **Step 4: Implement `useBeatVar`** — `src/visualizer/ui/useBeatVar.ts`

```ts
import { useEffect } from 'react'
import type { RefObject } from 'react'
import type { AudioSignal } from '../signal/types'
import { prefersReducedMotion } from '../../engine/motion'

// Writes the live beat (0–1) to a --beat CSS variable once per frame, so deck
// faces and the verse flash can react in CSS without re-rendering React.
export function useBeatVar(ref: RefObject<HTMLElement | null>, signal: AudioSignal): void {
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = ref.current
      if (el) el.style.setProperty('--beat', prefersReducedMotion() ? '0' : signal.beat.toFixed(3))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ref, signal])
}
```

- [ ] **Step 5: Implement the page** — in `src/pages/Mixtape.tsx`:
  - Delete the effect that saves `prev`, calls `setUniverse('verse')` and restores it on unmount, and delete the header comment's "Sets data-universe="earth-1610"…" sentence (replace with: `// Follows the active universe (spec §3.1); the page index switches it.`).
  - Add imports: `useRef` (merge), `PageIndex` from `'../comic/PageIndex'`, `useBeatVar` from `'../visualizer/ui/useBeatVar'`, `'../styles/mixtape-universe.css'`.
  - In the component add:

```tsx
  const universe = useUniverseStore((s) => s.activeUniverse)
  const setUniverse = useUniverseStore((s) => s.setUniverse)
  const pageRef = useRef<HTMLElement>(null)
  useBeatVar(pageRef, signal)
  const [noSplit, setNoSplit] = useState(false)
  const onDegrade = useCallback(() => setNoSplit(true), [])
```

  - Replace the `<main …>` opening tag with:

```tsx
    <main ref={pageRef} className={`viz-page ${deckHidden ? 'is-deck-hidden' : ''} ${noSplit ? 'no-split' : ''}`} data-universe={universe}>
```

  - Pass `onDegrade={onDegrade}` to `<VisualizerCanvas …/>`.
  - Replace the back link with:

```tsx
      <Link to={`/#u-${universe}`} className="viz-back">← BACK<span className="viz-back-long"> TO THE COMIC</span></Link>
```

  - Add, just before `<Deck />`: `<div className="viz-flash" aria-hidden="true" />` and `<PageIndex onSelect={setUniverse} />`.

Create `src/styles/mixtape-universe.css`:

```css
/* /mixtape per universe (spec §5, §6): backdrops, chrome skins, beat flash. */
.viz-page { background: #07070a; }
.viz-page[data-universe='616'] { background: #f4e8c8 radial-gradient(circle, rgba(27, 27, 27, .14) .8px, transparent 1px) 0 0 / 6px 6px; }
.viz-page[data-universe='mcu'] { background: radial-gradient(ellipse at 50% 55%, #0c1a2e 0%, #04070c 70%); }
.viz-page[data-universe='mcu']::before {
  content: ''; position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(127, 183, 255, .05) 0 1px, transparent 1px 3px);
}
.viz-page[data-universe='toon'] { background: #ffe14d; }
.viz-page[data-universe='verse'] { background: radial-gradient(ellipse at 50% 55%, #1a0a2a 0%, #07040c 70%); }

/* Verse: red/cyan split on the dots (dropped by .no-split when frames stay slow) */
.viz-page[data-universe='verse']:not(.no-split) .viz-canvas canvas {
  filter: drop-shadow(2px 0 0 rgba(0, 229, 255, .8)) drop-shadow(-2px 0 0 rgba(255, 45, 107, .8));
}
/* Verse beat flash: a full-screen layer that only shows on strong beats */
.viz-flash { position: fixed; inset: 0; z-index: 2; pointer-events: none; opacity: 0; }
.viz-page[data-universe='verse'] .viz-flash {
  background: linear-gradient(90deg, rgba(0, 229, 255, .35), rgba(255, 45, 107, .35));
  mix-blend-mode: screen;
  opacity: clamp(0, calc((var(--beat, 0) - .8) * 4), .6);
}
@media (prefers-reduced-motion: reduce) { .viz-page .viz-flash { display: none; } }

/* Chrome follows the comic skins */
.viz-back { color: var(--u-ink); font: 700 12px/1 var(--u-font-body); letter-spacing: .15em; text-decoration: none; border-bottom: 1px dashed currentColor; }
.viz-page .viz-chip { background: var(--u-bg); color: var(--u-ink); border: 2px solid var(--u-accent); }
.viz-page .viz-chip-track { color: var(--u-ink); }
.viz-page .viz-badge { background: var(--u-caption-bg); color: var(--u-ink); border: 2px solid var(--u-ink); }

/* Page index above the deck; drops to the reveal strip when the deck hides */
.viz-page .page-index { bottom: calc(var(--deck-h, 72px) + 12px); z-index: 12; transition: bottom 300ms ease; }
.viz-page.is-deck-hidden .page-index { bottom: 20px; }

@media (max-width: 767px) {
  .viz-back-long { display: none; }
  .viz-topright { top: 44px; left: 12px; right: 12px; justify-content: flex-end; flex-wrap: wrap; }
}
```

In `src/styles/visualizer.css`: change the `background` of `.viz-canvas` and of `.viz-fallback` to `transparent` (the page backdrop now shows through).

- [ ] **Step 6: Remove dead CSS** — for each class below, run `grep -rn "<class>" src --include=*.tsx --include=*.ts`; delete its rule block(s) from `src/styles/mixtape.css` **only if the grep prints nothing**:
  `mixtape-page`, `mixtape-page-header`, `mixtape-page-back`, `mixtape-page-grid`, `mixtape-now-card`, `mixtape-now-title`, `mixtape-now-artist`, `mixtape-now-scrub`, `mixtape-now-controls`, `mixtape-credits`.
  Keep everything else (the HUD widget, `mixtape-cover`, `mixtape-now-movie`, `mixtape-now-time`, `mixtape-control-*`, `mixtape-volume`, tracklist, reduced-motion block). Record the grep results in the commit message body.

- [ ] **Step 7:** `npx vitest run` → PASS (including the existing `fallback.test.tsx`: it still finds `viz-fallback` and the `Mixtape deck` label). Then `npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json` and `npm run lint` (3 errors, all pre-existing).

- [ ] **Step 8: Commit**

```bash
git add src/pages/Mixtape.tsx src/visualizer src/styles
git commit -m "feat(mixtape): follow the active universe, per-universe backdrops and chrome, beat var, verse split and flash"
```

---

### Task 10: Browser verification, performance and docs

**Files:**
- Modify: `C:\Users\shoke\Documents\Claude\Projects\SPIDERMAN\TRACKER.md` (outside the repo) — add a "Phase 4 — /mixtape universe decks" section
- No product code unless the pass finds a defect (fix it in its own commit, with a test where possible)

- [ ] **Step 1: Build and serve**

```bash
npm run build && npx vite preview --port 4173 --strictPort
```

(Run the preview in the background. It binds `localhost` over IPv6 only, so use `http://localhost:4173`, not `127.0.0.1`.)

- [ ] **Step 2: Screenshot all four universes** at 1280×720 and 390×844 with headless Chrome over CDP (Playwright is not installed). Save this script as `$CLAUDE_JOB_DIR/tmp/mix-shots.mjs` (any scratch dir outside the repo) and run `node mix-shots.mjs`:

```js
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
const OUT = process.argv[2] || '.'
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9340', `--user-data-dir=${OUT}/chrome-prof`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let ws
for (let i = 0; i < 40; i++) { try { const t = await (await fetch('http://127.0.0.1:9340/json/list')).json(); const p = t.find((x) => x.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break } } catch {} await sleep(250) }
await new Promise((r) => ws.addEventListener('open', r))
let id = 0; const pend = new Map()
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) } })
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value
for (const [w, h] of [[1280, 720], [390, 844]]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 })
  await send('Page.navigate', { url: 'http://localhost:4173/mixtape' })
  await sleep(5000)
  for (let k = 0; k < 4; k++) {
    const u = await ev("document.querySelector('main.viz-page').dataset.universe")
    const r = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(`${OUT}/mix-${w}-${u}.png`, Buffer.from(r.result.data, 'base64'))
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
    await sleep(1200)
  }
}
ws.close(); chrome.kill(); process.exit(0)
```

Open all 8 PNGs and check, for each: the right deck face (616 inked cassette, MCU HUD ring, toon boombox, verse glitch cassette); dots clearly visible on the backdrop (especially 616 cream and toon yellow); the page index above the deck, not overlapping it; the back link, Spotify chip and mode badge not overlapping each other at 390 px; no horizontal scroll. Fix anything wrong before continuing.

- [ ] **Step 3: Switching and hide checks** (same CDP harness, add evaluations): clicking a page-index fan button changes `data-universe`; pressing `h` sets `inert` on `.viz-deck` and moves `.page-index` down; ←/→ while focus is on the Volume range does not change universe.

- [ ] **Step 4: Verse frame time** — on `/mixtape` in verse with a track playing (`document.querySelector('[aria-label=Play]').click()`), sample `requestAnimationFrame` deltas for 5 s via `Runtime.evaluate` (collect into an array, return the median). Median ≤ 20 ms on the dev machine; report the number.

- [ ] **Step 5: Reduced motion** — `Emulation.setEmulatedMedia` with `features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]`, switch universes: instant face swap, no `.viz-flash` shown (`getComputedStyle(...).display === 'none'`), `--beat` stays `0`.

- [ ] **Step 6: Lighthouse and chunking**

```bash
npx -y lighthouse http://localhost:4173/ --preset=desktop --only-categories=performance,accessibility --quiet --chrome-flags="--headless=new" --output=json --output-path=./lh.json
```

Performance ≥ 90 on `/`. In `dist/assets/`, confirm the Mixtape chunk (`Mixtape-*.js`) is separate from `index-*.js` and that no face CSS (`inked`, `hud`, `boombox`) appears in the `index-*.css` bundle (`grep -l "face-inked" dist/assets/*.css`). Delete `lh.json` afterwards (do not commit it).

- [ ] **Step 7: Full gates** — `npx vitest run`, both `tsc` projects, `npm run lint` (exactly 3 pre-existing errors), `npm run build`. Stop the preview server.

- [ ] **Step 8: Tracker** — add to `SPIDERMAN/TRACKER.md` a "## Phase 4 — /mixtape universe decks" section: what shipped (faces, viz styles, switching, hash return), the measured numbers from Steps 4 and 6, and follow-ups (per-universe tracklists, WebGL glitch quad if the CSS split is ever dropped often, `AudioContext.resume()` autoplay race).

- [ ] **Step 9: Commit** any verification fixes (each separately, with tests). The tracker lives outside the repo; nothing to commit for it.
