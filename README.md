# 🕷️ Spider-Verse Portfolio

A cinematic, Spider-Man / Spider-Verse themed developer portfolio. Not a fan page — a dimensional event. Four parallel universes, a halftone WebGL intro, a custom web-shooter cursor, a Daily Bugle sidebar, and an ink-crawl symbiote easter egg.

> **Phase 1 — Mothership** ships the home experience. Phase 2 (linked universe apps) and Phase 3 (full products) are locked behind portals.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Three.js** — halftone loader + universe-transition GLSL shaders
- **GSAP** — cursor, spider-sense rings, Bugle fold, ink-crawl
- **Lenis** — smooth scroll wrapper
- **Zustand** — universe + audio stores
- **Howler.js** — ambient + FX (placeholder tracks for Phase 1)
- **Tailwind** + CSS custom properties — four universe palettes driven by `[data-universe]` on `<html>`
- **React Router v6** — `/` + locked Phase 2/3 stand-in routes

## The four universes

| Universe | Vibe | Lives at |
|---|---|---|
| `earth-1610` | Miles Morales · graffiti · dev projects | "Whatever it takes." |
| `earth-65` | Gwen Stacy · watercolor · design work | "Okay, I can do this." |
| `earth-138` | Spider-Punk · torn · open source | "Tear it down. Build it better." |
| `earth-928` | Spider-Man 2099 · HUD grid · AI/future | "The future is already here." |

## Local dev

```bash
npm install
npm run dev       # http://localhost:5173
npm run dev -- --open
```

Dev shortcut: append `?nointro` to skip the 2.5s halftone loader while iterating.

## Easter eggs

- Press **S → Y → M** (within 1.5s) anywhere on the page to summon the symbiote.
- The Daily Bugle sidebar collapses on click — content re-centers, click again to open.
- Every interactive element gets a Spider-Sense pulse on hover.

## Build & deploy

```bash
npm run build
npm run preview
```

The `vercel.json` ships with SPA rewrite, immutable asset cache, and basic security headers. Import the repo in the [Vercel dashboard](https://vercel.com/new) and it deploys with zero further config.

## Performance

Initial critical path is split aggressively:

| Chunk | Gzip | When |
|---|---|---|
| `react` | 60 KB | boot |
| `router` | 21 KB | boot |
| `index` (app) | 6.5 KB | boot |
| CSS | 6 KB | boot |
| `three` | 127 KB | deferred (post-mount) |
| `gsap` / `howler` / `lenis` | 27 / 10 / 5 KB | lazy (post-loader) |
| `LockedPage` | 0.4 KB | route-split |

## Accessibility

`prefers-reduced-motion` is honored across both CSS keyframes and the GSAP / Lenis paths — the halftone loader skips, the cursor drops its elastic lag, spider-sense rings don't render, the ink-crawl overlay doesn't draw, KAREN's flicker is off.

## License

MIT
