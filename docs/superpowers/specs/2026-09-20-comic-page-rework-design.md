# Comic Page Rework — the home page as a multiverse comic book

**Date:** 2026-09-20
**Status:** approved design, ready for planning
**Scope:** sub-project 2 of 3 (visualizer ✅ → **this** → deck restyle). Rework of `/` only. `/mixtape`, `/bugle`, `/suit`, the visualizer, stores, audio and data engines are untouched except where named.

## 1. Goal

Replace the current home page — four palette-swapped sections from one movie, each a header plus one card on a plain scroll, joined by a glitch overlay — with a **comic book of Spider-Man universes**. Each universe is a different Spider-Man franchise with its own native visual language, holds a chapter of the owner's story, and is a comic panel on the page. Scrolling stays normal; the seams between panels are comic gutters. Real official stills give it the actual-Spider-Man feel.

What the user named as wrong today, and what fixes it:

| Complaint | Fix |
|---|---|
| Transitions feel like a colour swap | Each universe is a *style* swap (print / cinematic / cel / glitch), joined by a comic gutter |
| Sections are static and empty | Two composed panel layouts with scroll-linked motion; multiple projects per universe |
| Scrolling is boring | Scroll-driven seams (tilt-and-settle, caption slide), cover page-lift, in-panel parallax and enter animations — no scroll hijacking |
| Look is templated | Four skins with their own type, borders, textures, easing and flourish |
| Not Spider-Man enough | Official stills and posters per universe, comic devices (captions, bubbles, sfx words, cover, page numbers) |

## 2. The four universes

Order is story order, not category order. Each is a chapter of the owner.

| # | id | Franchise | Native look | Chapter | Layout |
|---|---|---|---|---|---|
| 1 | `616` | Comic book (Ditko/Romita, Earth-616) | Yellowed paper, Ben-Day dots, hard ink, shout lettering | **Origins** — who the owner is | Splash |
| 2 | `mcu` | MCU (Holland) | Near-black, letterbox, film grain, Stark HUD lines | **Flagship** — the blockbuster projects | Splash |
| 3 | `toon` | Cartoon ('94 animated, Spectacular, Ultimate) | Flat cel colour, thick outlines, saturated skies, VHS scanlines | **Side quests** — experiments, fun builds | Grid |
| 4 | `verse` | Spider-Verse (Miles, Into/Across) | Deep purple, CMYK misregistration, glitch, hand-drawn halftone | **Everything else** + contact | Grid |

The current site's whole look becomes universe 4.

## 3. Page structure

```
Cover                 first viewport; masthead, issue, big still, four cover lines
ComicPanel[616]       splash
Gutter                caption: "MEANWHILE, IN ANOTHER UNIVERSE…"
ComicPanel[mcu]       splash
Gutter                caption (per data)
ComicPanel[toon]      grid
Gutter                caption
ComicPanel[verse]     grid
NextIssue             back cover: contact/links, still credits, "NEXT ISSUE" teaser stamps (the old locked portals)
```

Fixed chrome (outside the page flow, re-themed per universe — §5): Bugle sidebar, KAREN HUD + Suit standby (MCU only), Mixtape button, web cursor, PageIndex.

## 4. Data

Content is data, not JSX. Adding a project or a still is one entry.

- `src/data/universes.ts` — `Universe[]` (exactly four): `{ id, chapter: { number, kicker, title, tagline }, layout: 'splash' | 'grid', stillId, caption, sfx, itemSlugs: string[] }`.
- `src/data/projects.ts` — grows from 4 entries to the full project list seeded from the owner's vault (`Documentsault	uff vault\Projects`): DRISHTI, Idea Lab, Execution OS, Research Agent, Founder Discovery, Kerr black hole sim, Monte Carlo risk dashboard, SIPly Smart, Ledger investment lab, Personal investing assistant, Algo trading starter, Living Task Canvas, Productivity dashboard, Discord bot template, transcript tool, Claude design system, and this portfolio itself — **every vault project except the Sneha portfolio site**. Each gets `universe: UniverseId` per the chapter rule (`mcu` = flagship/deployed, `toon` = experiments/side quests, `verse` = everything else; `616` holds the bio, no projects). Existing fields (`title`, `blurb`, `tags`, `href`) stay; `href` may be a GitHub URL, a live URL, or absent (local-only projects render without a link). `itemSlugs` in a universe must all exist here.
- `src/data/stills.ts` — the still manifest: `{ id, universeId, src: '/stills/<universe>/<file>.jpg', alt, credit: { title, owner } }`. Every still has a credit.
- `src/data/cover.ts` — `{ masthead: 'THE AMAZING SMARTH', issue, price, stillId, coverLines: [{ universeId, text }] }`.
- `src/store/universeStore.ts` — `Universe` type becomes `'616' | 'mcu' | 'toon' | 'verse'`; `setUniverse` unchanged (still sets `data-universe` on `<html>`); `symbioteMode` stays.

Type `UniverseId` is the single source of truth; the DOM attribute value equals it.

## 5. Skins

A skin is a CSS token bundle in `src/styles/skins/<id>.css`, scoped to `[data-universe="<id>"]`, plus a shared contract in `src/styles/skins/contract.css` listing every required variable. Consumers (panels, chrome, cursor) use only contract variables.

Contract: `--u-bg`, `--u-paper` (texture image/gradient), `--u-ink`, `--u-accent`, `--u-accent-2`, `--u-font-display`, `--u-font-body`, `--u-panel-border` (width + colour), `--u-panel-shadow`, `--u-caption-bg`, `--u-ease` (a `cubic-bezier`), `--u-duration` (ms), `--u-scanline` (0 or 1).

| | 616 | mcu | toon | verse |
|---|---|---|---|---|
| ground | `#f4e8c8` paper + Ben-Day dots | `#06090f` + letterbox bars + grain | `#3ba7ff` cel sky, flat fills | `#12001f` + CMYK misregistration + scanlines |
| display type | Bangers | Rajdhani condensed, wide tracking | Luckiest Guy (OFL), self-hosted in `public/fonts` | Bangers, rotated, offset RGB shadow |
| body type | Share Tech Mono | Rajdhani | Rajdhani | Share Tech Mono |
| panel border | 4 px `#101010`, hard shadow `8px 8px 0` | 1 px `#7fb7ff` + corner brackets | 5 px `#101010`, `border-radius` wobble | 3 px `#101010` + RGB ghost edges |
| ease / duration | `power4.out` / 300 | `power2.inOut` / 900 | `back.out(1.6)` / 500 | stepped 12 fps + glitch frames / 400 |
| flourish | sfx word pop | HUD reticle scan over the still (SVG, once on enter) | speed-line burst on frame land | chromatic glitch tick every 6–9 s (reuses `glitch.frag` inside the panel only) |

Fonts: Bangers, Rajdhani, Share Tech Mono already ship in `public/fonts`; one new cel face is added the same way. All skins pass 4.5:1 body contrast.

**Fixed chrome per skin** (all keyed by `data-universe` on `<html>`, set by `universeStore`):
- `DailyBugle` → `BugleSkin` wrapper renders one of four presentations of the same headlines: 616 newsprint masthead / MCU news ticker / toon TV bumper / verse glitch broadsheet (the current one). Data + fetching unchanged.
- `KarenHUD` and `SuitStandby` render only while `activeUniverse === 'mcu'` (mount/unmount with a 300 ms fade).
- `webCursor` reads `--u-ink`/`--u-accent` for its stroke; shape unchanged.
- Mixtape button re-themes via tokens only.
- `SymbioteToggle` unchanged.

## 6. Components

All new components live in `src/comic/`.

- **`ComicPanel`** `{ universe, children }` — the frame: `data-universe`, ink border, shadow, `min-height: 100vh`, gutter caption slot. Reports itself to `universeStore` at ≥ 55% intersection (same IO pattern as `UniverseShell`, which it replaces).
- **`SplashPanel`** `{ universe }` — still full-bleed on the left 50% (right on `mcu` for rhythm), ScrollTrigger `scrub` parallax ±6% (off on mobile / reduced motion); chapter block (kicker → title → tagline → one `FocusBlock`: bio for `616`, the single flagship `ProjectFrame` for `mcu`), staggered enter (once); corner `CaptionBox`.
- **`GridPanel`** `{ universe }` — 12-col grid: still sub-panel (5 cols) + title/tagline + `SpeechBubble` (7 cols) on row 1; `ProjectFrame`s in rows of 3 (12 cols); frames enter in reading order with `translateY(24px) rotate(-1.5deg) → 0` via `ScrollTrigger.batch` (once); `SfxWord` pops on the first frame.
- **`ProjectFrame`** `{ project }` — ink-bordered card: title, blurb, tags, link; hover lifts 4 px with the skin's ease.
- **`Gutter`** `{ from, to, caption }` — 8 vh black band. Progress `b = clamp((seamY - viewportBottom) / -viewportHeight)`, computed by one ScrollTrigger with `scrub: true`: the following panel's outer wrapper gets `translateY((1-b)*18px) rotate((1-b)*-1.5deg)`; `CaptionBox` slides in from the left over `b ∈ [0.2, 0.5]` and out over `[0.85, 1]`.
- **`Cover`** — first viewport, pinned only for its own lift: masthead, issue/price stamp, cover still, four cover lines (anchors). When the visitor scrolls past 10% of the viewport the cover plays a page-lift once (`rotateY(-100deg)` about the left edge, 600 ms, `--u-ease` of 616), then unpins and normal flow continues. Reduced motion: no pin, no lift, the cover just scrolls. Panel 1's still is `loading="eager"`; the old `halftoneLoader` is removed.
- **`PageIndex`** — fixed bottom-left (KAREN owns bottom-right in MCU): `p.1/4 · EARTH-616`; hover/click fans four thumbnails (still crops); click scrolls (Lenis `scrollTo`); `←/→` flip; reflects `universeStore.activeUniverse`. Collapses to `p.1/4` under 768 px.
- **`NextIssue`** — back cover: contact/links; `StillCredits` list (every still's credit + the takedown note, same wording as the mixtape credits); the old `LockedPortals` hexagons become "NEXT ISSUE" rubber-stamp teasers.
- **`CaptionBox`**, **`SpeechBubble`**, **`SfxWord`** — small presentational primitives styled by the contract tokens.

Removed: `sections/Earth1610|65|138|928.tsx`, `sections/LockedPortals.tsx`, `components/UniverseShell.tsx`, `engine/universeTransition.ts` (its `glitch.frag` is kept for the verse flourish), `engine/halftoneLoader.ts`, `styles/sections.css`. `pages/Home.tsx` becomes the assembly of §3.

## 7. Motion rules

- Everything is scroll-linked (`scrub`) or once-on-enter. The only pin is the cover lift (≤ 600 ms). No scroll hijacking, no wheel interception. Lenis smooth scroll stays.
- Every animation honours `prefersReducedMotion()` from `engine/motion.ts`: static frames, no parallax, no lift, no glitch ticks, no reticle scan.
- GSAP + ScrollTrigger are dynamic-imported after first paint (same discipline as today); the cover and panels render correctly without them.

## 8. Assets

- Stills: `public/stills/<universe>/<name>.jpg`, ≤ 200 KB each, sized for 1600 px wide max, plus a `-thumb.jpg` (400 px) for `PageIndex`. `loading="lazy"` except the cover still and panel 1. Candidates are sourced by the implementer from the web (official stills/posters/promo art per franchise: 616 comic art, MCU film stills, '94/Spectacular/Ultimate cartoon frames, Into/Across the Spider-Verse frames; plus one cover image), saved under `public/stills/_candidates/<universe>/` with a `sources.md` listing origin URLs, and presented to the owner for approval; approved files are moved into place and the rest deleted before merge. The manifest in `data/stills.ts` is the only place stills are referenced.
- Fan-site posture: every still credited in `NextIssue`; the credits paragraph carries the same "personal portfolio, not affiliated, contact for removal" wording as the mixtape.
- Missing/failed image → the universe's paper texture with the sfx word, never a broken image (`onError` swap).
- Lighthouse desktop on `/` stays ≥ 90; stills are the main risk — lazy loading and the size cap are hard requirements.

## 9. Mobile (< 768 px)

Single column. `SplashPanel` stacks still (16:9) over text; `GridPanel` frames one per row; gutter caption becomes a full-width strip; parallax and page-lift off; `PageIndex` collapses; the Bugle sidebar becomes a top masthead bar (existing behaviour, re-themed).

## 10. Testing

- **Vitest (pure):** data validation — exactly four universes in story order, every `itemSlug` resolves, every `stillId` resolves, every still has a credit, cover lines cover all four universes; `Gutter` progress math; `PageIndex` next/prev logic and keyboard mapping; skin contract — each `skins/<id>.css` defines every variable in `contract.css` (a test parses the files).
- **RTL:** `ComicPanel`, `SplashPanel`, `GridPanel`, `Cover`, `NextIssue` render with fixture data; `KarenHUD`/`SuitStandby` absent outside `mcu`; `BugleSkin` picks the right presentation per `data-universe`.
- **Manual:** each universe in Chrome (seam motion, enter animations, flourish, chrome re-theme), keyboard page flip, phone width, reduced motion, Lighthouse.
- Existing 101 tests stay green; the visualizer suite is untouched.

## 11. Out of scope

Deck/visualizer restyle (sub-project 3); `/bugle` and `/suit` pages; new Bugle data sources; project detail pages; the beat-flash glitch quad and other visualizer follow-ups.

## 12. Order of work

1. Data + skins: `universes.ts`, `projects.ts` expansion, `stills.ts` (with placeholder paper textures until the owner drops real stills), `cover.ts`, the four skin CSS files + contract + test, `universeStore` id change.
2. Panel primitives: `ComicPanel`, `CaptionBox`, `SpeechBubble`, `SfxWord`, `ProjectFrame`, `SplashPanel`, `GridPanel` with RTL tests.
3. `Gutter` + `Cover` + `NextIssue`; assemble `Home.tsx`; remove the old sections/transition/loader.
4. Fixed chrome re-theme: `BugleSkin`, MCU-only KAREN/Suit, cursor tokens, Mixtape button, `PageIndex`.
5. Motion pass: ScrollTrigger seams, parallax, enter batches, flourishes, reduced motion.
6. Assets + gates: real stills in, credits, lazy/size checks, mobile pass, Lighthouse.
