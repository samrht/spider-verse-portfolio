# Halftone Field — 3D music visualizer for `/mixtape`

**Date:** 2026-09-13
**Status:** approved design, ready for planning
**Scope:** sub-project 1 of 3 (visualizer → portfolio look/transition rework → deck restyle). This spec covers the visualizer and its Spotify now-playing feed only.

## 1. Goal

Rebuild `/mixtape` around a fullscreen 3D particle field that reacts to music. The field is tens of thousands of halftone (Ben-Day) dots that rest as a breathing sphere and morph into other shapes (cloud, web, explosion, emblem) as the song moves through sections. The existing Mixtape player stays the audio source; a hideable cassette-deck bar is its new face. A public "what Smarth is listening to" Spotify feed is layered on top.

Target feel: the dots *are* the comic print, and the song is drawing with them.

## 2. Constraints that shaped the design

- **Spotify exposes no audio.** The Web Playback SDK plays DRM'd audio that cannot be routed through an `AnalyserNode`; the Audio Analysis / Audio Features endpoints are closed to apps created after Nov 2024. The visualizer therefore never reads Spotify audio.
- **Spotify Development Mode** allows at most 25 allowlisted users to authorize an app. Visitors cannot connect their own accounts. Spotify in this portfolio is a **public now-playing feed of the owner's account**, served through a serverless route that holds the owner's refresh token. No playback control is exposed (a public page must not be able to pause the owner's music).
- **Licensing.** The visualizer is driven by the owner's own MP3s and the owner's own offline analysis of those files. Spotify only supplies "which track, what position". No Spotify recording is synchronized to visuals.
- **Performance budget.** Portfolio Lighthouse on `/` stays ≥ 90; the visualizer is lazy-loaded and touches nothing on `/`. Target 60 fps on an RTX 3050 laptop, usable on a mid-range phone.

## 3. Signal layer

One interface, three hot-swappable providers. The engine never knows which one is active.

```ts
interface AudioSignal {                      // sampled every frame
  bass: number; mids: number; highs: number; // 0..1, attack/release smoothed
  energy: number;                            // 0..1, slow-smoothed loudness
  beat: number;                              // 1.0 on onset, exponential decay to 0
  section: { index: number; energy: 'low' | 'mid' | 'high' | 'drop' };
  mode: 'live' | 'synced' | 'procedural';
}
interface SignalProvider {
  start(): Promise<void>;
  stop(): void;
  sample(out: AudioSignal, nowSeconds: number): void;
}
```

| Tier | Provider | Source | Badge |
|---|---|---|---|
| A | `LiveFFT` | Local mixtape `Howl` routed through Web Audio: `MediaElementSource → AnalyserNode` (fftSize 1024). The Howl is `html5: true`, so its `<audio>` element is not on `Howler.ctx`; `mixtapeEngine` gains a `getMediaElement()` accessor (reads `howl._sounds[0]._node`, a stable-but-private Howler field) and `LiveFFT` calls `ctx.createMediaElementSource(el)` once per element and connects it to both the analyser and `ctx.destination`. If the accessor returns nothing, `LiveFFT` reports unavailable and `select.ts` falls through. Band averages: bass 20–150 Hz, mids 150–2 kHz, highs 2–16 kHz. Onset = spectral-flux above a rolling threshold. Sections = energy-shift detector (slow-smoothed energy crosses ±1 band for ≥ 2 s). | `LIVE FFT` |
| B | `BeatMap` | `/beatmaps/<slug>.json` indexed by playback position. Position comes from the local `Howl` (listen-along) or the Spotify poll (interpolated). | `SYNCED` |
| C | `Procedural` | BPM 120 clock + layered sines + value noise; a section boundary every 28–34 s with cycling energy. | `PROCEDURAL` |

**Beat-map format** (`public/beatmaps/<slug>.json`):

```json
{ "slug": "whats-up-danger", "spotifyId": "…", "bpm": 132, "durationS": 221.4,
  "beats": [0.41, 0.86, …],
  "sections": [{ "start": 0, "energy": "low" }, { "start": 31.2, "energy": "high" }, …],
  "bands": { "rateHz": 20, "data": [[0.31, 0.22, 0.10], …] } }
```

**Offline analyser** `scripts/analyse-track.mjs <mp3> [--out public/beatmaps]`: Node script. Decodes with ffmpeg (`ffmpeg -i in.mp3 -f f32le -ac 1 -ar 22050 -`), runs a 2048-point FFT at 20 Hz hop, emits band energies, spectral-flux onsets → beats, BPM by autocorrelation of the onset envelope, sections by the same energy-shift rule as `LiveFFT` (shared code in `signal/sections.ts`). Maps for the current mixtape tracks are generated once and committed.

**Provider selection** (`signal/select.ts`, pure):

```
local track playing → LiveFFT (falls to BeatMap if AnalyserNode unavailable, else Procedural)
Spotify playing a track with a beat map → BeatMap (position from the poll)
Spotify playing anything else → Procedural
nothing playing → Procedural at 30% energy (idle breathing)
```

## 4. Particle engine

**Location:** `src/visualizer/` — no imports from the rest of the portfolio except `universeStore` (palette) and `mixtapeStore` (playback). Structure:

```
src/visualizer/
  signal/     types.ts LiveFFT.ts BeatMap.ts Procedural.ts onset.ts sections.ts bands.ts select.ts spotifyPoll.ts
  targets/    sphere.ts cloud.ts web.ts explosion.ts emblem.ts index.ts   (each: (n, seed) => Float32Array(n*3))
  engine/     ParticleField.ts morph.ts palette.ts shaders/points.vert shaders/points.frag
  ui/         Deck.tsx ModeBadge.tsx Tracklist.tsx SpotifyChip.tsx
  VisualizerCanvas.tsx
  debug/      DebugOverlay.tsx
```

**Rendering.** One `THREE.Points` with a `ShaderMaterial`. Dot count N: 40 000 desktop, 12 000 when `devicePixelRatio ≥ 2 && hardwareConcurrency ≤ 4` or the viewport is < 768 px; `?dots=<n>` overrides.

Attributes (per point): `aTargetA` vec3, `aTargetB` vec3, `aSeed` float.
Uniforms: `uMorph` (0→1), `uBass`, `uMids`, `uHighs`, `uBeat`, `uEnergy`, `uTime`, `uPalette` (vec3[3]), `uPointScale`.

Vertex shader:
```
p   = mix(aTargetA, aTargetB, smoothstep(0,1,uMorph))
p  += snoise(p * 2.0 + uTime * 0.4) * uMids * 0.3
p  *= 1.0 + uBass * 0.25
gl_PointSize = uPointScale * (1.2 + uHighs * 1.5 + aSeed * 0.6) / -mvPosition.z
```
Fragment: hard-edged disc (`discard` outside r = 0.5 → halftone look), colour = `uPalette[int(aSeed*3)]`, alpha by depth, additive blending, `uBeat` mixes toward white at the core.

**Morph state machine** (`engine/morph.ts`, pure, no Three):

- States: `idle(target)`, `transition(from, to, t0, 900 ms)`.
- Input: `section` changes from the signal, track start/end.
- Target by section energy: `low → sphere`, `mid → web`, `high → cloud`, `drop → explosion`. `emblem` for the first 3 s of every track.
- Guards: minimum 6 s dwell in `idle`; never re-target the same shape; `explosion` auto-returns to `sphere` after 4 s regardless of section.
- On transition start the engine copies the current blended positions into `aTargetA`, writes the new target into `aTargetB`, resets `uMorph = 0`.

**Styling axis** is independent of geometry: `uPalette` follows `universeStore` (switching universe recolours the dots live); the beat flash is a one-frame fullscreen quad reusing `shaders/glitch.frag` at `uIntensity = 0.25`. Reduced motion (`prefersReducedMotion()`): no morphs, no flash, breathing amplitude halved.

**Targets** are deterministic functions of `(n, seed)`: `sphere` = Fibonacci sphere r = 1; `cloud` = sphere × (1 + fbm noise × 0.6); `web` = 14 spokes + 9 spiral rings on a plane, jittered ±0.02, filled to n by sampling along threads; `explosion` = sphere positions × (1.8 + seed × 1.2) with a radial velocity baked as position; `emblem` = points sampled from the spider-emblem SVG path (`public/emblem.svg`) extruded ±0.05.

## 5. `/mixtape` page and deck UI

- `pages/Mixtape.tsx` becomes: `<VisualizerCanvas />` fullscreen (`position: fixed; inset: 0; z-index: 0`), `<ModeBadge />` and `<SpotifyChip />` top-right, `<Deck />` fixed bottom.
- The existing `mixtapeEngine` / `mixtapeStore` remain the player. `Deck` replaces `MixtapeHUD` as their face: two tape reels (rotate while playing), title/artist, scrubber (existing 250 ms poll), transport, `≡` slides the `Tracklist` up from the deck, `⌄` hides.
- **Hide:** `⌄` or the `H` key tween the deck out (GSAP `y: 100%`, 350 ms, `power3.inOut`); auto-hide after 5 s without pointer movement while playing; any `pointermove`, tap, or `H` brings it back. `mixtapeStore.deckHidden: boolean`. A 12 px hover strip at the bottom edge stays interactive while hidden.
- **Listen along:** when the Spotify feed's `spotifyId` matches a `MIXTAPE_TRACKS[].spotifyId` (new optional field), `SpotifyChip` shows "▶ listen along"; clicking loads that local track, seeks to the interpolated Spotify position, plays, and switches the provider to `LiveFFT`.
- Styling for v1 reuses `styles/tokens.css` and `styles/mixtape.css` unchanged; a restyle is a later sub-project.

## 6. Spotify now-playing feed

- **`api/now-playing.ts`** — Vercel serverless function. Env: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`. Exchanges the refresh token for an access token (module-scope cache until 60 s before expiry), calls `GET /v1/me/player/currently-playing`; on 204 falls back to `GET /v1/me/player/recently-played?limit=1`. Response:
  ```json
  { "isPlaying": true, "spotifyId": "…", "track": "…", "artist": "…", "album": "…", "art": "https://…", "progressMs": 92000, "durationMs": 221000, "fetchedAt": 1789240000000 }
  ```
  or `{ "isPlaying": false, "lastPlayed": { …same shape minus progress… } }`. Header `Cache-Control: public, s-maxage=3, stale-while-revalidate=10`. Tokens never reach the browser. Errors return `{ "error": "unavailable" }` with 200 so the client path stays simple.
- **`scripts/spotify-auth.mjs`** — one-time: prints the authorization URL (scopes `user-read-currently-playing user-read-recently-played`), listens on `http://localhost:8888/callback`, exchanges the code, prints the refresh token for `vercel env add`. Run once by the owner.
- **`signal/spotifyPoll.ts`** — polls `/api/now-playing` every 3 s while `/mixtape` is mounted (paused when `document.hidden`); interpolates `progressMs + (Date.now() − fetchedAt)`; exposes a small Zustand store `{ status: 'playing' | 'idle' | 'offline', … }`.

## 7. Failure modes (all non-fatal)

| Condition | Behaviour |
|---|---|
| No WebGL / shader compile error at mount | Static page: album art + deck; badge hidden. |
| `AnalyserNode` unavailable or `AudioContext` suspended (Safari autoplay) | `LiveFFT` → `BeatMap` if a map exists → else `Procedural`; badge updates. Context resumes on the next user gesture and the provider is re-selected. |
| Missing / malformed beat map | `Procedural`. |
| `/api/now-playing` error or `offline` | `SpotifyChip` shows `SPOTIFY OFFLINE` for 10 s then hides; visualizer unaffected. |
| Frame time > 24 ms for 2 s | Halve N once (rebuild buffers), never more than once per session. |

## 8. Testing

Vitest is added to the repo (none exists yet).

- **Unit (pure):** `bands.ts` averaging against synthetic spectra; `onset.ts` detects impulses and ignores steady tones; `sections.ts` on a stepped energy curve; `morph.ts` dwell / same-target / explosion-return guards; `BeatMap` lookup by position incl. before-first-beat and after-end; `spotifyPoll` interpolation and offline transition; `select.ts` provider table; `api/now-playing` handler with mocked `fetch` (token refresh, 204 fallback, error shape).
- **Visual/debug:** `/mixtape?debug` mounts `DebugOverlay` — live band bars, beat pulse, section index, morph state, provider name, fps, N. Same role as blackhole-sim's `?parity`.
- **Manual before merge:** each mixtape track plays with visible morphs at section boundaries; hide/auto-hide/`H`; listen-along seeks within 1 s of Spotify; Lighthouse on `/` ≥ 90; reduced-motion path; phone check.

## 9. Out of scope

Portfolio look-and-feel and transition rework (sub-project 2); deck restyle (sub-project 3); manual morph control; GPGPU / physics particles; visitor Spotify auth; playback control of the owner's Spotify.

## 10. Order of work

1. Signal layer (`types`, `bands`, `onset`, `sections`, `Procedural`, `select`) with tests; Vitest setup.
2. Targets + `ParticleField` + shaders; `VisualizerCanvas`; `?debug` overlay; `Procedural` driving it end-to-end.
3. `LiveFFT` on the existing `Howl`; `/mixtape` integration; `Deck`, hide/auto-hide, tracklist.
4. `analyse-track.mjs`; beat maps for the mixtape tracks; `BeatMap` provider.
5. `api/now-playing.ts`, `spotify-auth.mjs`, `spotifyPoll`, `SpotifyChip`, listen-along.
6. Failure paths, N auto-halving, reduced motion, phone pass, Lighthouse.
