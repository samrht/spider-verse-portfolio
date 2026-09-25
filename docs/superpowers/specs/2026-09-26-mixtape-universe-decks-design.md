# /mixtape universe decks — design

Date: 2026-09-26 · Status: approved in brainstorming, awaiting spec review
Sub-project 3 of the portfolio rework (1 = Halftone Field visualizer, 2 = comic-book `/`).

## 1. Goal

`/mixtape` is the only page still in the pre-comic look: a dark neon verse theme, forced to Miles' palette whatever universe the visitor came from. Make it part of the four-universe comic book:

- it opens in the universe the visitor came from and can switch between all four;
- each universe gets its own deck *object* and its own way of drawing the halftone dots;
- the music, audio engine, beat maps, Spotify feed and signal tiers stay exactly as they are.

Success = a visitor who flips 616 → MCU → toon → verse on `/mixtape` sees four clearly different "places" (not four colour themes), with every control working identically in each.

## 2. Decisions (owner, brainstorming 2026-09-25/26)

| Question | Decision |
|---|---|
| Relation to universes | **D** — follows the universe you came from, plus an on-page switcher |
| Deck | **B** — a different deck object per universe (616 inked cassette, MCU HUD ring, toon boombox, verse glitch cassette) |
| Visualizer | **B** — per-universe backdrop, blend mode and dot drawing; the star emblem stays the same everywhere (no per-universe spider emblems) |
| Music | **A** — the same nine-track Spider-Verse mixtape in every universe |
| Switcher | **A** — the home page's page-corner index (`p.N/4 · NAME`, fan of four covers), above the deck; ←/→ flips |
| Architecture | **1** — one deck controller hook, four presentational faces |

## 3. Structure

### 3.1 Universe source
- `/mixtape` no longer forces `verse`. `Mixtape.tsx` drops the `setUniverse('verse')` effect and the hard-coded `data-universe="verse"`; the page's `data-universe` follows `useUniverseStore.activeUniverse`.
- Arriving directly (bookmark, fresh load) → the store default, `616`.
- Leaving keeps the universe as it is; the back link goes to `/#u-<activeUniverse>`.
- `Home` honours a `#u-<id>` hash on load: after first paint it scrolls that panel to the top (instant, no smooth scroll) and sets the store to that universe. An unknown hash is ignored.

### 3.2 Units
- **`src/visualizer/ui/useDeckControls.ts`** (new). Wraps `useMixtapeStore` + `useDeckHide` and returns one object:
  `{ track, movieLabel, isPlaying, progress, duration, pct, shuffle, repeat, volume, listOpen, hidden, toggle, next, prev, seek, setVolume, toggleShuffle, cycleRepeat, toggleList, toggleHidden, show, fmt }`.
  No markup. The logic is today's `Deck` logic lifted out unchanged.
- **Faces** — `src/visualizer/ui/faces/{InkedCassette,HudRing,Boombox,GlitchCassette}.tsx`, one CSS file each under `src/styles/faces/`. Each takes `{ c: DeckControls }`, renders the same control set (§4.1) and owns only markup + styles.
- **`Deck.tsx`** becomes a shell: reads `activeUniverse`, picks the face (`FACES: Record<Universe, Face>`), keeps the hide/reveal slide and the `Tracklist`, cross-fades faces on switch (§4.3), applies `inert` when hidden.
- **`src/visualizer/engine/vizStyles.ts`** (new, pure data, no DOM/THREE): `VIZ_STYLES: Record<Universe, VizStyle>`, `VizStyle = { blend: 'normal' | 'additive'; palette: [string, string, string]; ink: string; dot: 'ink' | 'holo' | 'cel' | 'glitch'; beatFx: 'swell' | 'pulse' | 'bounce' | 'split'; lightBackdrop: boolean }`.
  `palette.ts` `paletteFor()` reads its colours from here (single source).
- **`PageIndex`** gains an optional `onSelect?: (u: Universe) => void` prop. Default (home) = `scrollToUniverse`; `/mixtape` passes `setUniverse`. The ←/→ handler uses the same callback. Existing modal / input guard unchanged.

### 3.3 Data flow
`universeStore.activeUniverse` →
- `Deck` → face;
- `VisualizerCanvas` → `ParticleField.setUniverse(u)` → palette + style uniforms + material blending (§5);
- `.viz-page[data-universe]` → backdrop, chip/badge/back-link skins via CSS.

Audio (`mixtapeEngine`), beat maps, `useSignal`, Spotify polling: untouched.

## 4. Deck faces

### 4.1 Shared control contract
Every face renders, with these exact accessible names (so one test covers all four):
universe/movie label, title (`h2`), artist, **Track progress** (range), elapsed/total times, **Toggle shuffle**, **Previous track**, **Play**/**Pause**, **Next track**, **Repeat: off|all|one**, **Volume** (range; desktop only), **Toggle tracklist**, **Hide player (H)**.
Focus order is the list order. `data-spider-sense` stays on buttons.

### 4.2 The four faces
- **616 · Inked Cassette** — cream (`#fffdf5`) cassette shell, 3px ink border, 4px hard offset shadow; two reels with ink spokes, spinning while playing; tilted paper label holding title (Bangers, `#c0392b`), artist and "SIDE A"; tape-style scrubber (ink outline, red fill); play = yellow disc with ink ring; small controls = ink icons in square panels.
- **MCU · HUD Ring** — translucent navy glass bar (`rgba(10,22,40,.85)`), 1px `#7fb7ff` lines, faint scanline; play/pause in the centre of a circular ring whose outer arc is progress (pointer-drag on the arc seeks; the **Track progress** range stays in the DOM, visually hidden, as the keyboard control); title in spaced Rajdhani caps, readout "F.R.I.D.A.Y. // AUDIO"; hexagonal buttons with `#ff2d2d` accents.
- **Toon · Boombox** — white rounded body, 4px `#101010` outline, bold offset shadow; two speaker cones whose centres pump on the beat; title Luckiest Guy `#ff3b3b` with black stroke; fat rounded scrubber; big red play button.
- **Verse · Glitch Cassette** — today's deck markup and styles, with the title's red/cyan split and a small chromatic flicker on the beat.

Beat-driven face motion (speaker pump, verse flicker) reads `AudioSignal.beat` from the same `signal` object `useSignal` already gives the visualizer; `Mixtape` passes `signal` to `Deck`, faces read it in a rAF loop (no React re-render per frame) and never subscribe to audio themselves.

### 4.3 Switching and hiding
- Switch: outgoing face fades + scales to 0.96 over 200 ms, incoming fades in; reels/speakers resume the current play state. Reduced motion: instant swap.
- Hide (⌄ / H) slides the deck out as today; while hidden the deck root is `inert` and `aria-hidden`; the reveal strip stays.

### 4.4 Phones (< 768 px)
Every face stacks into two rows (object + title / scrubber + transport). MCU ring 56 px; boombox shows one speaker; 616 label drops "SIDE A"; volume hidden.

## 5. Visualizer styles

| | 616 | MCU | toon | verse |
|---|---|---|---|---|
| Backdrop (CSS, `.viz-page[data-universe]`) | cream paper + faint halftone texture | navy radial glow + scanline overlay | flat `#ffe14d` | today's dark purple radial |
| `blend` | normal | additive | normal | additive |
| `palette` | `#c0392b`, `#1f4e9c`, `#1b1b1b` | `#7fb7ff`, `#ff2d2d`, `#e6f1ff` | `#ff3b3b`, `#1f6feb`, `#101010` | `#ff2d6b`, `#00e5ff`, `#ffffff` |
| `ink` (outline) | `#1b1b1b` | — | `#101010` | — |
| `dot` | hard disc, ±15 % size jitter by seed | soft radial falloff, per-dot flicker (`uTime`, seed) | 1.4× disc with an ink outline ring | hard disc |
| `beatFx` | swell (size) | pulse (brightness) | bounce (radial offset) | split + flash |

- **Why the light palettes change:** with additive blending, and with today's white/yellow slots, dots vanish on cream or yellow. 616 and toon switch to normal blending and ink/blue colours. Invariant (tested): when `lightBackdrop` is true, `blend` is `normal` and no palette colour has relative luminance above 0.6.
- **Shader:** `points.frag` / `points.vert` gain `uniform int uStyle`, `uniform vec3 uInk`, `uniform float uTime` alongside `uPalette` / `uBeat`. `setUniverse(u)` sets them and `material.blending`, then `material.needsUpdate = true`.
- **Colour switch:** palette uniforms tween over ~400 ms (lerp per frame in `ParticleField.update`); style/blend switch at the tween midpoint.
- **Verse split + flash:** CSS on the canvas (`filter: drop-shadow(2px 0 #00e5ff) drop-shadow(-2px 0 #ff2d6b)`) plus a full-screen flash layer (`.viz-flash`) toggled for one frame on beats above threshold. This replaces the parked WebGL "beat-flash glitch quad". The frame guard (`frameGuard.ts`) today halves N once after sustained slow frames; in verse, a *second* guard trip (slow frames persisting after the halve) drops the canvas filter instead (flash stays). `VisualizerCanvas` exposes this as an `onDegrade` callback so `Mixtape` can toggle a `.no-split` class.
- **Reduced motion:** no flicker, flash, bounce or swell; colours, backdrops and blend still change.
- **No-WebGL fallback:** the static `.viz-fallback` cover picks up the universe backdrop.
- The morph targets (sphere, web, cloud, emblem star, explosion) and `MorphMachine` are unchanged.

## 6. Page chrome

- Back link: "← BACK TO THE COMIC" → `/#u-<activeUniverse>`; "← BACK" under 768 px.
- `SpotifyChip` and `ModeBadge` restyle per universe via `--u-*` (accent border, ink/paper for 616 and toon).
- Phones: the chip and badge wrap below the back link (fixes today's overlap).
- `PageIndex` on `/mixtape`: bottom-left, raised above the deck (`bottom: calc(deck height + 12px)`); drops to just above the reveal strip when the deck is hidden.

## 7. Cleanup folded in
- Hidden deck `inert` (§4.3).
- Delete the dead `.mixtape-page*` rules in `src/styles/mixtape.css` after grepping for consumers (the back link's `mixtape-page-back` class is replaced by `viz-back`).
- Verse beat flash (§5) closes the parked glitch-quad item.

Out of scope (still parked): `AudioContext.resume()` autoplay race; per-universe tracklists (tracks keep their `movie` tag; a `universe` tag can be added later without touching faces).

## 8. Testing and gates

Unit:
- `useDeckControls` — each action calls the matching store action; `pct`/`fmt` edge cases.
- `vizStyles` — an entry per `Universe`; the light-backdrop invariant in §5; `paletteFor()` returns the table's colours.

Component (RTL):
- One shared test run over all four faces: every accessible name in §4.1 present, buttons call the controls.
- `Deck` swaps faces when `activeUniverse` changes; hidden deck has `inert`.
- `PageIndex` with `onSelect` calls it on click and on ←/→ instead of scrolling.
- `Mixtape` opens in the store's universe (not forced to verse); `data-universe` follows the store; back link targets `/#u-<id>`.
- `Home` with `#u-toon` sets the store to `toon`.

Browser pass (headless Chrome over CDP, as in sub-project 2):
- screenshots of all four universes at 1280×720 and 390×844 (deck, dots on the right backdrop, chrome not overlapping);
- switch via page index click and ←/→;
- verse frame time with the split on (sample `performance.now()` deltas over 5 s; median ≤ 20 ms on the dev machine);
- reduced motion;
- Lighthouse desktop on `/` ≥ 90 and `Mixtape-*.js` still a separate lazy chunk.

Gates: `npm test` green; `npm run lint` stays at the 3 pre-existing Bugle-file errors; `tsc` (app + node) clean; `npm run build` green.

## 9. Risks
- **Normal blending order artifacts** on 616/toon (points aren't depth-sorted; `depthWrite` stays off). Dots are near-opaque and small, so overlap errors should read as print texture; if they look wrong, sort by depth once per morph target rather than per frame.
- **CSS filter cost** on the verse canvas — mitigated by the frame-guard fallback in §5.
- **HUD ring seeking** by pointer on an arc needs angle → time maths; the hidden range keeps keyboard and screen-reader seeking reliable regardless.
