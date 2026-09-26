# /mixtape listen modes — mic mode + album-art colours — design

Date: 2026-09-27 · Status: approved in brainstorming, awaiting spec review
Follows sub-project 3 (universe decks, live) and the fullscreen/clip polish (live at 852eec7).

## 1. Goal

Two new ways for the Halftone Field to get its motion and colour:

- **Mic mode** — a 🎤 toggle that makes the dots react to whatever is playing in the room (Spotify included) through the microphone. It is the only way Spotify songs can genuinely drive the visuals (Spotify exposes no audio to the web).
- **Album-art colours** — while the owner is playing on Spotify and nothing local plays, the dots take their colours from that song's cover.

The four universe decks, backdrops, audio engine, beat maps, fullscreen and clip features stay as they are.

## 2. Decisions (owner, 2026-09-27)

| Question | Decision |
|---|---|
| Where album colours apply | **A** — only while Spotify is *playing*, no local track plays, and mic mode is off |
| Mic behaviour | **A** — explicit takeover: while on, the mic drives the dots whatever else plays |
| Architecture | **1** — two plug-ins on the existing signal pipeline (shared analyser core; palette override on the field) |
| Mic denied / no mic | controller default: brief "MIC BLOCKED" note, button returns to off |
| "Last played" (Spotify idle) | controller default: universe colours |
| Clip while mic on | controller default: clip records visuals + no audio (room audio would be muddy; the clip's music comes from the local track only) |

## 3. Mic mode

### 3.1 Units
- **`src/visualizer/signal/analyserCore.ts`** (new) — `AnalyserCore`: the band / onset / section logic currently inside `LiveFFT.sample()` and its setup (`bins`, `ranges`, `OnsetDetector`, `SectionDetector`, smoothing, `lastPerf`), moved verbatim. API: `attach(analyser: AnalyserNode, sampleRate: number)`, `detach()`, `sample(out: AudioSignal)`, `reset()`.
- **`LiveFFT`** keeps its media-element wiring, the module-wide source cache, `audioTap()` and all R16 context rules; it creates its `AnalyserNode` and delegates sampling to `AnalyserCore`. Behaviour unchanged.
- **`src/visualizer/signal/MicFFT.ts`** (new) — `SignalProvider` with `mode = 'live'`:
  - `start()`: `navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })`, `ctx.createMediaStreamSource(stream)` → `AnalyserNode` (fftSize 1024, smoothing 0.6) → `AnalyserCore.attach`. The source is **never** connected to `ctx.destination` (no feedback). Uses the same shared `AudioContext` accessor as `LiveFFT` and resumes it first.
  - `stop()`: `detach`, disconnect, stop every track of the stream (the browser's recording indicator turns off).
  - `static available()`: `!!navigator.mediaDevices?.getUserMedia && LiveFFT.available()`.
- **`select.ts`** — `SelectInput` gains `micOn: boolean`; when true the result is the new kind `'mic'`, before every other rule. `ProviderKind` gains `'mic'`.
- **`useSignal`** — accepts `mic?: { on: boolean }` in `SignalInputs`; instantiates `MicFFT` for kind `'mic'` the same way it instantiates `LiveFFT` for `'live'` (start on select, stop on deselect/unmount). A `start()` rejection reports back (see §3.2) and selection falls through.
- **`src/visualizer/ui/useMicMode.ts`** (new) — `{ supported, state: 'off' | 'starting' | 'on' | 'blocked', toggle() }`. `toggle()` from off → `starting`; the page's signal hook reports success (`on`) or failure (`blocked` for ~4 s, then `off`). Leaving `/mixtape` turns it off.

### 3.2 Page
- 🎤 button in `.viz-topright` beside ⏺/⛶, key **M** (same input/modifier guard as F/C). Hidden when `MicFFT.available()` is false.
- `ModeBadge` shows **ROOM MIC** for kind `'mic'` (its `LABEL: Record<ProviderKind, string>` gains the entry; `LiveFFT.test.ts` keeps passing unchanged after the core extraction).
- Blocked: the button shows a small "MIC BLOCKED" tooltip-style note for ~4 s (aria-live polite) and returns to off.
- Clip while mic on: `useClipRecorder` records video only (no audio tap) when the active kind is `'mic'`.

## 4. Album-art colours

### 4.1 When
`spotify.status === 'playing'` **and** `!localPlaying` **and** `!micOn` **and** the feed has an `art` URL. Otherwise: universe palette.

### 4.2 Units
- **`src/visualizer/signal/artPalette.ts`** (new):
  - `extractPalette(pixels: Uint8ClampedArray): [string, string, string] | null` — pure. Buckets RGB at 4 bits/channel; skips pixels with HSL saturation < 0.18, lightness < 0.08 or > 0.94; scores bucket = count × (0.5 + saturation); picks the top 3 whose pairwise RGB distance ≥ 60; returns `null` when fewer than 2 qualify (a greyscale cover). With exactly 2, the third is the first lightened 20 %.
  - `artPalette(url): Promise<[string, string, string] | null>` — loads `new Image()` with `crossOrigin = 'anonymous'`, draws at 32×32 on a canvas, `getImageData` (a taint or load error → `null`), `extractPalette`. Cached per URL (Map, max 20 entries, oldest evicted).
  - `fitToBackdrop(colors, universe): [string, string, string]` — pure. For `VIZ_STYLES[u].lightBackdrop` universes, darken any colour with relative luminance > 0.6 until ≤ 0.6; otherwise lighten any colour with luminance < 0.12 until ≥ 0.12. Hue preserved (HSL lightness steps).
- **`ParticleField.setPaletteOverride(colors: [string, string, string] | null)`** — tweens the palette uniforms toward the override (or back to the universe palette on `null`) over `TWEEN_S` (0.4 s) using the existing tween machinery, **without** changing `uStyle`, `uInk` or blending. A later `setUniverse(u)` while an override is active switches style/blend and keeps the override colours (re-fitted by the hook); clearing the override then returns to `u`'s palette. Reduced motion: instant.
- **`VisualizerCanvas`** — prop `paletteOverride?: [string, string, string] | null` → effect calls `field.setPaletteOverride`.
- **`src/visualizer/ui/useArtPalette.ts`** (new) — inputs: Spotify status + art URL, `localPlaying`, `micOn`, active universe. Output: fitted colours or `null`. Ignores a result if the art URL changed while loading (latest wins).
- **`SpotifyChip`** — while an override is active, shows three 8 px swatches of the fitted colours after the cover (`aria-hidden`).

### 4.3 Failure modes
- Cover fails to load / canvas tainted / greyscale → `null` → universe palette, no error UI.
- Rapid track changes → only the latest cover applies.
- Spotify offline → universe palette (condition false).

## 5. Testing and gates

Unit:
- `AnalyserCore` — the band/onset/section expectations currently exercised for `LiveFFT` keep passing against the core.
- `MicFFT` — with a fake `getUserMedia` + fake `AudioContext`: start wires stream → analyser and **not** → destination; stop stops every track; start rejection propagates.
- `select` — `micOn` wins over local/beat map/Spotify; existing cases unchanged.
- `useMicMode` — off → starting → on; failure → blocked → off after 4 s.
- `extractPalette` — two-colour synthetic cover returns its colours; greyscale returns `null`; near-duplicate colours collapse.
- `artPalette` — load error → `null`; cache returns the same promise result without reloading.
- `fitToBackdrop` — every output within the luminance bounds for all four universes.
- `ParticleField.setPaletteOverride` — tweens in, keeps style/blend, clears back to the universe palette.
- `useArtPalette` — applies only when playing && !local && !mic; latest-art-wins.

Component / page: 🎤 button visibility + M key + ROOM MIC badge; chip swatches appear with an override.

Browser pass (headless Chrome over CDP): mic mode with Chrome's fake media stream (`--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`) produces a non-zero signal and the ROOM MIC badge; album colours from a real Spotify cover URL (evaluate `artPalette` on the live chip's art) render on the dots in 616 and MCU; no console errors.

Gates: `npx vitest run` green; `npm run lint` at exactly the 3 pre-existing Bugle-file errors; both `tsc` projects clean; `npm run build` green; the new code stays in the `Mixtape` chunk.

## 6. Out of scope
Per-universe tracklists; visitor Spotify login; syncing mic beats to Spotify position; recording mic audio into clips.
