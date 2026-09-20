# Comic Page Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the home page as a comic book of four Spider-Man universes (616 comic, MCU, cartoon, Spider-Verse) — a cover, four comic panels with their own skins and layouts, comic-gutter seams driven by normal scroll, re-themed fixed chrome, a page-corner index, and official stills.

**Architecture:** Universe ids become `'616' | 'mcu' | 'toon' | 'verse'` everywhere (one rename task with an old→new remap so ambient audio, Bugle colours, suit modes and the visualizer palette carry over). Each universe is a CSS *skin* (`styles/skins/<id>.css`) that defines a new `--u-*` contract AND the legacy `--universe-*` aliases, so untouched chrome keeps working. New components in `src/comic/` render from data (`data/universes.ts`, `projects.ts`, `stills.ts`, `cover.ts`); GSAP ScrollTrigger (dynamic-imported) drives seams, parallax and enter animations; everything honours reduced motion. The old sections, `UniverseShell`, the glitch site-transition and the halftone loader are removed.

**Tech Stack:** Vite 8, React 19, TypeScript 6, GSAP 3 + ScrollTrigger, Lenis, Zustand 5, Vitest + RTL (jsdom), Google Fonts (`@import` in `typography.css`).

**Spec:** `docs/superpowers/specs/2026-09-20-comic-page-rework-design.md`

## Global Constraints

- Universe ids exactly `'616' | 'mcu' | 'toon' | 'verse'`, story order 616 → mcu → toon → verse. Remap of old ids: `earth-1610 → verse`, `earth-65 → toon`, `earth-138 → 616`, `earth-928 → mcu` (audio files keep their names; only keys change).
- Skin contract variables (every `skins/<id>.css` must define all): `--u-bg`, `--u-paper`, `--u-ink`, `--u-accent`, `--u-accent-2`, `--u-font-display`, `--u-font-body`, `--u-panel-border`, `--u-panel-shadow`, `--u-caption-bg`, `--u-ease`, `--u-duration`, `--u-scanline`; plus the legacy aliases `--universe-bg`, `--universe-primary`, `--universe-accent`, `--universe-text`, `--universe-surface`, `--universe-glow`.
- Skin grounds: 616 `#f4e8c8` paper + Ben-Day dots; mcu `#06090f` + letterbox + grain; toon `#3ba7ff` cel; verse `#12001f` + CMYK misregistration + scanlines. Display faces: 616 Bangers, mcu Rajdhani, toon Luckiest Guy, verse Bangers. Eases/durations: 616 `cubic-bezier(.16,1,.3,1)`/300 ms, mcu `cubic-bezier(.45,0,.55,1)`/900 ms, toon `cubic-bezier(.34,1.56,.64,1)`/500 ms, verse `steps(5)`/400 ms.
- Layouts: 616 and mcu = `splash`; toon and verse = `grid`. 616 holds the bio (no projects); mcu = flagship/deployed; toon = experiments; verse = everything else + contact.
- Projects: every vault project except the Sneha portfolio site (list in Task 2).
- Gutter seam: 8 vh black band; following panel `translateY((1-b)*18px) rotate((1-b)*-1.5deg)`; caption in over b ∈ [0.2, 0.5], out over [0.85, 1]. Cover lift: `rotateY(-100deg)` about the left edge, 600 ms, once, pinned only for its own lift. Parallax ±6%. Grid frames enter `translateY(24px) rotate(-1.5deg) → 0` in reading order, once.
- Motion: scroll-linked (`scrub`) or once-on-enter only; the cover lift is the only pin; all motion honours `prefersReducedMotion()` from `src/engine/motion.ts`; GSAP/ScrollTrigger dynamic-imported after first paint; Lenis stays.
- Chrome: KAREN + Suit standby render only while `activeUniverse === 'mcu'`; `PageIndex` fixed bottom-left, collapses to `p.N/4` under 768 px; Bugle has four presentations keyed by `data-universe`.
- Stills: `public/stills/<universe>/<name>.jpg` ≤ 200 KB, ≤ 1600 px wide, `-thumb.jpg` 400 px; `loading="lazy"` except cover + panel 1; every still credited in `NextIssue`; broken image → skin paper fallback.
- `/mixtape`, `/bugle`, `/suit`, the visualizer suite, stores' behaviour, audio engines: untouched except the id rename. Existing 101 tests stay green. Lighthouse desktop on `/` ≥ 90.
- Style: 2-space, no semicolons, single quotes, `import type`, `erasableSyntaxOnly` (no parameter properties / enums), `noUnusedLocals`. `react-hooks` v7 rules — restructure, don't disable. Commits: plain messages, **no** `Co-Authored-By`. Lint gate: touched files clean via `npx eslint <paths>`; repo-wide `npm run lint` has 3 pre-existing Bugle-file errors that must not grow.
- All commands from `C:\Users\shoke\Documents\Claude\Projects\SPIDERMAN\spider-verse-portfolio`, branch `feat/comic-page`.

## File map

| Path | Responsibility |
|---|---|
| `src/store/universeStore.ts` | `Universe` = `'616'\|'mcu'\|'toon'\|'verse'`, `UNIVERSE_IDS` in story order, `setUniverse` |
| `src/styles/skins/contract.css` | documents the contract (comment list) + `[data-universe]` fallbacks |
| `src/styles/skins/{616,mcu,toon,verse}.css` | one skin each: `--u-*` + legacy `--universe-*` aliases |
| `src/styles/skins/__tests__/contract.test.ts` | parses the four files; every contract var present |
| `src/styles/tokens.css` | layout constants + symbiote override only (universe palettes move to skins) |
| `src/data/universes.ts` | `UNIVERSES: UniverseDef[]` (4), `universeById` |
| `src/data/projects.ts` | full project list with `universe` |
| `src/data/stills.ts` | still manifest + `stillById`, `PAPER_FALLBACK` |
| `src/data/cover.ts` | masthead, issue, cover lines |
| `src/data/__tests__/comicData.test.ts` | cross-reference validation |
| `src/comic/ComicPanel.tsx` | frame + IO report to store |
| `src/comic/primitives.tsx` | `CaptionBox`, `SpeechBubble`, `SfxWord`, `Still` (with fallback) |
| `src/comic/ProjectFrame.tsx` | project card |
| `src/comic/SplashPanel.tsx`, `GridPanel.tsx` | the two layouts |
| `src/comic/Gutter.tsx`, `Cover.tsx`, `NextIssue.tsx`, `PageIndex.tsx` | seams, cover, back cover, nav |
| `src/comic/motion.ts` | GSAP/ScrollTrigger loader + `bindGutter`, `bindParallax`, `bindEnterBatch`, `bindCoverLift` |
| `src/comic/flourish.ts` | per-skin flourish hooks (sfx pop, reticle, speed lines, glitch tick) |
| `src/comic/__tests__/*.test.tsx` | RTL tests |
| `src/styles/comic.css` | all comic component styles (uses contract vars only) |
| `src/components/BugleSkin.tsx` | four presentations wrapper around `DailyBugle` |
| `src/pages/Home.tsx` | assembly |
| removed | `src/sections/*`, `src/components/UniverseShell.tsx`, `src/engine/universeTransition.ts`, `src/engine/halftoneLoader.ts`, `src/styles/sections.css` |

---

### Task 1: Universe id rename + skin system

**Files:**
- Modify: `src/store/universeStore.ts`, `src/data/bugleHeadlines.ts`, `src/pages/Bugle.tsx:20-32`, `src/engine/soundEngine.ts:21-24`, `src/types/suit.ts:21-26`, `src/visualizer/engine/palette.ts`, `src/visualizer/engine/__tests__/palette.test.ts`, `src/visualizer/engine/ParticleField.ts:55`, `src/pages/Mixtape.tsx:37`, `src/engine/webCursor.ts:132,146`, `src/engine/universeTransition.ts:20-23`, `src/data/projects.ts` (ids only, content replaced in Task 2), `src/sections/*.tsx` (ids only; deleted in Task 5), `src/styles/tokens.css`, `src/styles/typography.css:9`, `src/index.css` (import skins)
- Create: `src/styles/skins/contract.css`, `src/styles/skins/616.css`, `mcu.css`, `toon.css`, `verse.css`
- Test: `src/styles/skins/__tests__/contract.test.ts`

**Interfaces:**
- Produces: `type Universe = '616' | 'mcu' | 'toon' | 'verse'`, `UNIVERSE_IDS` (story order), `useUniverseStore` unchanged otherwise. CSS: every `[data-universe="<id>"]` scope defines the contract + legacy aliases; `:root` defaults to `616`.

- [ ] **Step 1: Write the failing contract test**

`src/styles/skins/__tests__/contract.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(__dirname, '..')
const IDS = ['616', 'mcu', 'toon', 'verse'] as const
export const CONTRACT = [
  '--u-bg', '--u-paper', '--u-ink', '--u-accent', '--u-accent-2',
  '--u-font-display', '--u-font-body', '--u-panel-border', '--u-panel-shadow',
  '--u-caption-bg', '--u-ease', '--u-duration', '--u-scanline',
  '--universe-bg', '--universe-primary', '--universe-accent', '--universe-text',
  '--universe-surface', '--universe-glow',
] as const

describe('skin contract', () => {
  it.each(IDS)('%s.css defines every contract variable inside its [data-universe] scope', (id) => {
    const css = readFileSync(join(DIR, `${id}.css`), 'utf8')
    expect(css).toContain(`[data-universe="${id}"]`)
    for (const v of CONTRACT) expect(css, `${id} missing ${v}`).toMatch(new RegExp(`${v}\\s*:`))
  })
  it('contract.css lists every variable name', () => {
    const css = readFileSync(join(DIR, 'contract.css'), 'utf8')
    for (const v of CONTRACT) expect(css).toContain(v)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/styles/skins`
Expected: FAIL — files do not exist.

- [ ] **Step 3: Rename the ids**

`src/store/universeStore.ts` — replace the type and list:
```ts
export type Universe = '616' | 'mcu' | 'toon' | 'verse'

// Story order: comic origins → MCU flagship → cartoon side quests → Spider-Verse.
export const UNIVERSE_IDS: readonly Universe[] = ['616', 'mcu', 'toon', 'verse']
```
and `activeUniverse: '616'` as the initial state. Everything else in the file stays.

Apply the remap `earth-1610 → verse`, `earth-65 → toon`, `earth-138 → 616`, `earth-928 → mcu` in:
- `src/data/bugleHeadlines.ts` (every `universe:` value)
- `src/pages/Bugle.tsx` `SECTION_SCOPE`: `technology: 'mcu'`, `sports: '616'`, `politics: 'verse'`, `science: 'toon'`, `entertainment: { universe: 'toon', token: 'accent' }`
- `src/engine/soundEngine.ts` `AMBIENT` keys: `verse: …ambient-1610…`, `toon: …ambient-65…`, `'616': …ambient-138…`, `mcu: …ambient-928…` (file names unchanged)
- `src/types/suit.ts` `SUIT_MODE_UNIVERSE`: `earth1610: 'verse'`, `earth65: 'toon'`, `earth138: '616'`, `earth928: 'mcu'`
- `src/visualizer/engine/palette.ts` — new hex values (the skins' primary/accent): `'616': ['#c0392b', '#ffd400']`, `mcu: ['#7fb7ff', '#ff2d2d']`, `toon: ['#ff3b3b', '#ffe14d']`, `verse: ['#ff2d6b', '#00e5ff']` (PRIMARY first, ACCENT second); update `palette.test.ts` to `paletteFor('616')[0] === 'c0392b'` and `paletteFor('mcu')[0] === '7fb7ff'`
- `src/visualizer/engine/ParticleField.ts:55` → `paletteFor('verse')`
- `src/pages/Mixtape.tsx:37` → `setUniverse('verse')`
- `src/engine/webCursor.ts` lines 132 and 146: `[data-universe="earth-65"]` → `[data-universe="toon"]`
- `src/engine/universeTransition.ts` `PRIMARY_RGB` keys → new ids (file is deleted in Task 5; keep it compiling until then)
- `src/data/projects.ts` `universe:` values → `verse`, `toon`, `616`, `mcu` respectively; `src/sections/Earth1610.tsx` etc. → matching filters and `universe=` props (deleted in Task 5)
- `src/styles/animations.css:62` `.decor-earth-928` → `.decor-mcu` (or delete the rule; it dies with sections.css in Task 5)

- [ ] **Step 4: Write the skins**

Add Luckiest Guy to the font import in `src/styles/typography.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Bangers&family=Luckiest+Guy&family=Rajdhani:wght@400;500;600&family=Share+Tech+Mono&display=swap');
```

`src/styles/skins/contract.css`:
```css
/* Skin contract — every skins/<id>.css MUST define all of these inside
 * [data-universe="<id>"]. Consumers use ONLY these variables.
 *   --u-bg  --u-paper  --u-ink  --u-accent  --u-accent-2
 *   --u-font-display  --u-font-body
 *   --u-panel-border  --u-panel-shadow  --u-caption-bg
 *   --u-ease  --u-duration  --u-scanline
 * Legacy aliases (kept so Bugle/Suit/cursor/mixtape keep working):
 *   --universe-bg  --universe-primary  --universe-accent  --universe-text
 *   --universe-surface  --universe-glow
 * :root falls back to the 616 skin (see 616.css). */
```

`src/styles/skins/616.css`:
```css
/* Earth-616 — printed comic. Yellowed paper, Ben-Day dots, hard ink. */
:root,
[data-universe="616"] {
  --u-bg: #f4e8c8;
  --u-paper: radial-gradient(circle, rgba(192, 57, 43, 0.45) 1.1px, transparent 1.3px) 0 0 / 7px 7px;
  --u-ink: #1b1b1b;
  --u-accent: #c0392b;
  --u-accent-2: #ffd400;
  --u-font-display: 'Bangers', cursive;
  --u-font-body: 'Share Tech Mono', ui-monospace, monospace;
  --u-panel-border: 4px solid #101010;
  --u-panel-shadow: 8px 8px 0 #000;
  --u-caption-bg: #ffd400;
  --u-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --u-duration: 300ms;
  --u-scanline: 0;

  --universe-bg: #f4e8c8;
  --universe-primary: #c0392b;
  --universe-accent: #ffd400;
  --universe-text: #1b1b1b;
  --universe-surface: rgba(27, 27, 27, 0.06);
  --universe-glow: 0 0 0 transparent;
}
```

`src/styles/skins/mcu.css`:
```css
/* MCU — cinematic. Near-black, letterbox, film grain, Stark HUD lines. */
[data-universe="mcu"] {
  --u-bg: #06090f;
  --u-paper: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.035) 0 2px, transparent 2px 4px);
  --u-ink: #e6f1ff;
  --u-accent: #7fb7ff;
  --u-accent-2: #ff2d2d;
  --u-font-display: 'Rajdhani', system-ui, sans-serif;
  --u-font-body: 'Rajdhani', system-ui, sans-serif;
  --u-panel-border: 1px solid #7fb7ff;
  --u-panel-shadow: 0 0 40px rgba(127, 183, 255, 0.18);
  --u-caption-bg: #0e1a2b;
  --u-ease: cubic-bezier(0.45, 0, 0.55, 1);
  --u-duration: 900ms;
  --u-scanline: 1;

  --universe-bg: #06090f;
  --universe-primary: #7fb7ff;
  --universe-accent: #ff2d2d;
  --universe-text: #e6f1ff;
  --universe-surface: rgba(127, 183, 255, 0.07);
  --universe-glow: 0 0 40px rgba(127, 183, 255, 0.25);
}
```

`src/styles/skins/toon.css`:
```css
/* Cartoon — '94 / Spectacular / Ultimate. Flat cel colour, thick outlines. */
[data-universe="toon"] {
  --u-bg: #3ba7ff;
  --u-paper: linear-gradient(180deg, #3ba7ff 0 66%, #ff3b3b 66% 100%);
  --u-ink: #101010;
  --u-accent: #ff3b3b;
  --u-accent-2: #ffe14d;
  --u-font-display: 'Luckiest Guy', 'Bangers', cursive;
  --u-font-body: 'Rajdhani', system-ui, sans-serif;
  --u-panel-border: 5px solid #101010;
  --u-panel-shadow: 6px 6px 0 #101010;
  --u-caption-bg: #ffe14d;
  --u-ease: cubic-bezier(0.34, 1.56, 0.64, 1);
  --u-duration: 500ms;
  --u-scanline: 1;

  --universe-bg: #3ba7ff;
  --universe-primary: #ff3b3b;
  --universe-accent: #ffe14d;
  --universe-text: #101010;
  --universe-surface: rgba(255, 255, 255, 0.35);
  --universe-glow: 0 0 0 transparent;
}
```

`src/styles/skins/verse.css`:
```css
/* Spider-Verse — Miles. Deep purple, CMYK misregistration, scanlines. */
[data-universe="verse"] {
  --u-bg: #12001f;
  --u-paper: repeating-linear-gradient(90deg, transparent 0 18px, rgba(255, 45, 107, 0.10) 18px 20px);
  --u-ink: #f0e6ff;
  --u-accent: #ff2d6b;
  --u-accent-2: #00e5ff;
  --u-font-display: 'Bangers', cursive;
  --u-font-body: 'Share Tech Mono', ui-monospace, monospace;
  --u-panel-border: 3px solid #101010;
  --u-panel-shadow: -3px 0 0 #00e5ff, 3px 0 0 #ff2d6b;
  --u-caption-bg: #ff2d6b;
  --u-ease: steps(5);
  --u-duration: 400ms;
  --u-scanline: 1;

  --universe-bg: #12001f;
  --universe-primary: #ff2d6b;
  --universe-accent: #00e5ff;
  --universe-text: #f0e6ff;
  --universe-surface: rgba(255, 45, 107, 0.08);
  --universe-glow: 0 0 40px rgba(255, 45, 107, 0.35);
}
```

`src/styles/tokens.css` — delete the four `[data-universe="earth-*"]` blocks and the `:root, [data-universe="earth-1610"]` default block; keep the layout constants at the top and the `[data-symbiote="true"]` override (it overrides `--universe-*`; also add the same values for `--u-bg/--u-ink/--u-accent/--u-accent-2` so symbiote mode darkens the comic too).

Import order in `src/index.css` (after `tokens.css`): `@import './styles/skins/contract.css'; @import './styles/skins/616.css'; @import './styles/skins/mcu.css'; @import './styles/skins/toon.css'; @import './styles/skins/verse.css';` — check how `index.css` currently imports `tokens.css`/`typography.css` and follow that pattern exactly.

- [ ] **Step 5: Run tests, build, lint**

Run: `npx vitest run` → all green (contract 5 tests + existing 101; `palette.test.ts` updated). `npm run build` passes (every `'earth-*'` literal is gone: `grep -rn "earth-" src --include=*.ts --include=*.tsx` returns only comments). `npx eslint src/store src/data src/pages src/engine src/visualizer src/types` clean.

- [ ] **Step 6: Manual smoke**

`npm run dev`, open `/?nointro`: sections render in the new palettes (616 paper first), `/mixtape` still works (dots in the verse palette), `/bugle` colours mapped, `/suit` modes still switch. No console errors.

- [ ] **Step 7: Commit**

```bash
git add -A src/styles src/store src/data src/pages src/engine src/visualizer src/types src/sections src/index.css
git commit -m "feat(comic): rename universes to 616/mcu/toon/verse and add the four skins"
```

---

### Task 2: Content data + validation

**Files:**
- Create: `src/data/universes.ts`, `src/data/stills.ts`, `src/data/cover.ts`
- Modify: `src/data/projects.ts` (full rewrite of the list; keep the `Project` interface, add `slug` = `id`)
- Test: `src/data/__tests__/comicData.test.ts`

**Interfaces:**
- Produces: `interface UniverseDef { id: Universe; chapter: { number: number; kicker: string; title: string; tagline: string }; layout: 'splash' | 'grid'; stillId: string; caption: string; sfx: string; itemSlugs: string[] }`, `UNIVERSES: readonly UniverseDef[]`, `universeById(id): UniverseDef`; `interface Still { id: string; universeId: Universe | 'cover'; src: string; thumb: string; alt: string; credit: { title: string; owner: string } }`, `STILLS`, `stillById(id): Still | undefined`, `PAPER_FALLBACK = '/stills/paper-fallback.svg'`; `COVER: { masthead: string; issue: string; price: string; stillId: string; coverLines: { universeId: Universe; text: string }[] }`; `projects: Project[]` with `universe` per the chapter rule and `projectBySlug(slug)`.

- [ ] **Step 1: Write the failing test**

`src/data/__tests__/comicData.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { UNIVERSES, universeById } from '../universes'
import { STILLS, stillById } from '../stills'
import { COVER } from '../cover'
import { projects, projectBySlug } from '../projects'
import { UNIVERSE_IDS } from '../../store/universeStore'

describe('comic data', () => {
  it('has exactly four universes in story order', () => {
    expect(UNIVERSES.map((u) => u.id)).toEqual(['616', 'mcu', 'toon', 'verse'])
    expect(UNIVERSES.map((u) => u.id)).toEqual([...UNIVERSE_IDS])
    expect(UNIVERSES.map((u) => u.chapter.number)).toEqual([1, 2, 3, 4])
  })
  it('uses splash for 616/mcu and grid for toon/verse', () => {
    expect(universeById('616').layout).toBe('splash')
    expect(universeById('mcu').layout).toBe('splash')
    expect(universeById('toon').layout).toBe('grid')
    expect(universeById('verse').layout).toBe('grid')
  })
  it('every itemSlug resolves to a project in the same universe', () => {
    for (const u of UNIVERSES) for (const slug of u.itemSlugs) {
      const p = projectBySlug(slug)
      expect(p, `${u.id}: ${slug}`).toBeDefined()
      expect(p!.universe).toBe(u.id)
    }
  })
  it('616 holds no projects; every other project is listed exactly once', () => {
    expect(universeById('616').itemSlugs).toEqual([])
    const listed = UNIVERSES.flatMap((u) => u.itemSlugs)
    const all = projects.filter((p) => p.universe !== '616').map((p) => p.slug)
    expect([...listed].sort()).toEqual([...all].sort())
    expect(new Set(listed).size).toBe(listed.length)
  })
  it('includes every vault project except the Sneha portfolio', () => {
    const slugs = projects.map((p) => p.slug)
    for (const s of ['drishti', 'idea-lab', 'execution-os', 'research-agent', 'founder-discovery',
      'blackhole-sim', 'montecarlo-risk-dashboard', 'siply-smart', 'ledger-investment-lab',
      'investing-assistant', 'algo-trading-starter', 'living-task-canvas', 'productivity-dashboard',
      'discord-bot-template', 'transcript-tool', 'claude-design-system', 'spider-verse-portfolio'])
      expect(slugs, s).toContain(s)
    expect(slugs.join(' ')).not.toMatch(/sneha/i)
  })
  it('every still has a credit and every referenced still exists', () => {
    for (const s of STILLS) { expect(s.credit.title).toBeTruthy(); expect(s.credit.owner).toBeTruthy(); expect(s.src).toMatch(/^\/stills\//) }
    for (const u of UNIVERSES) expect(stillById(u.stillId), u.id).toBeDefined()
    expect(stillById(COVER.stillId)).toBeDefined()
  })
  it('cover lines cover all four universes', () => {
    expect(COVER.coverLines.map((c) => c.universeId).sort()).toEqual(['616', 'mcu', 'toon', 'verse'])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/data`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write projects.ts**

Replace the list (keep the interface, add `slug`). Mapping per the chapter rule — `mcu` (flagship, deployed): drishti, idea-lab, execution-os, research-agent, spider-verse-portfolio; `toon` (experiments/side quests): blackhole-sim, living-task-canvas, algo-trading-starter, productivity-dashboard, claude-design-system, transcript-tool; `verse` (everything else): founder-discovery, montecarlo-risk-dashboard, siply-smart, ledger-investment-lab, investing-assistant, discord-bot-template.

```ts
import type { Universe } from '../store/universeStore'

export interface Project {
  id: string
  slug: string
  title: string
  description: string
  tags: string[]
  universe: Universe
  link?: string
  repoLink?: string
  image?: string
  featured: boolean
}

const P = (p: Omit<Project, 'id'>): Project => ({ ...p, id: p.slug })

export const projects: Project[] = [
  // —— MCU · flagship, deployed ————————————————————————————————
  P({ slug: 'drishti', title: 'DRISHTI', universe: 'mcu', featured: true,
    description: 'Offline satellite change detection over Assam/Arunachal: CLIP retrieval, spectral + radar change, cloud-aware confidence, analyst feedback loop. 351 hand-labelled pairs; 7.8% false-alarm rate.',
    tags: ['Python', 'FastAPI', 'CLIP', 'GEE', 'React'], repoLink: 'https://github.com/samrht/drishti' }),
  P({ slug: 'idea-lab', title: 'Idea Lab', universe: 'mcu', featured: true,
    description: 'An execution translator: dump a "what if", get an honest reality check, a skill diff, and a week-by-week learning journey. Semantic cache on pgvector.',
    tags: ['Next.js', 'Prisma', 'Neon', 'Gemini'], link: 'https://idea-lab-mu.vercel.app' }),
  P({ slug: 'execution-os', title: 'Execution OS', universe: 'mcu', featured: true,
    description: 'A ranked "do this next" engine for many parallel goals. Deterministic scoring, an LLM only for parsing messy capture.',
    tags: ['Next.js', 'Prisma', 'Gemini'], link: 'https://execution-os-kappa.vercel.app', repoLink: 'https://github.com/samrht/execution-os' }),
  P({ slug: 'research-agent', title: 'Research Agent', universe: 'mcu', featured: true,
    description: 'Paste a paper or drop a 25 MB PDF, get a streamed State of the Field report with live-search evidence for and against.',
    tags: ['Next.js', 'Gemini', 'Vercel Blob'], repoLink: 'https://github.com/samrht/research-agent' }),
  P({ slug: 'spider-verse-portfolio', title: 'This Site', universe: 'mcu', featured: true,
    description: 'A multiverse comic book with a GPU halftone music visualizer, a public Spotify feed, a Daily Bugle that reads real news, and a suit HUD.',
    tags: ['React', 'Three.js', 'GLSL', 'GSAP'], repoLink: 'https://github.com/samrht/spider-verse-portfolio' }),

  // —— Cartoon · experiments and side quests ————————————————————
  P({ slug: 'blackhole-sim', title: 'Kerr Black Hole', universe: 'toon', featured: true,
    description: 'Real-time general-relativistic ray tracer of a spinning black hole\'s accretion disk, in the browser on WebGPU. Real physics, real colour.',
    tags: ['WebGPU', 'TypeScript', 'Physics'], repoLink: 'https://github.com/samrht/blackhole-sim' }),
  P({ slug: 'living-task-canvas', title: 'Living Task Canvas', universe: 'toon', featured: false,
    description: 'A todo app where tasks visibly wilt as they age. Neglect you can see.',
    tags: ['React', 'Vite'] }),
  P({ slug: 'algo-trading-starter', title: 'Algo Trading Starter', universe: 'toon', featured: false,
    description: 'NSE daily-swing pipeline: data, backtester with real Indian costs, paper trading, Dhan adapter.',
    tags: ['Python', 'pandas', 'NSE'] }),
  P({ slug: 'productivity-dashboard', title: 'Productivity Dashboard', universe: 'toon', featured: false,
    description: 'One self-contained HTML file, no build step, Chart.js and a dark theme. Open it and it works.',
    tags: ['HTML', 'Chart.js'] }),
  P({ slug: 'claude-design-system', title: 'Claude Design System', universe: 'toon', featured: false,
    description: 'A reusable system prompt for making AI generate premium, non-generic UI. One strong idea, ruthless restraint.',
    tags: ['Design', 'Prompting'] }),
  P({ slug: 'transcript-tool', title: 'Transcript Tool', universe: 'toon', featured: false,
    description: 'Turns recordings into clean, searchable transcripts.',
    tags: ['TypeScript'], repoLink: 'https://github.com/samrht/transcript-tool' }),

  // —— Spider-Verse · everything else ————————————————————————————
  P({ slug: 'founder-discovery', title: 'Founder Discovery', universe: 'verse', featured: false,
    description: 'Finds and scores founders as leads from HN, YC and Reddit; six weighted dimensions, evidence per score, human-edited outreach.',
    tags: ['Next.js', 'Gemini', 'SQLite'], repoLink: 'https://github.com/samrht/founder-discovery' }),
  P({ slug: 'montecarlo-risk-dashboard', title: 'Monte Carlo Risk Dashboard', universe: 'verse', featured: true,
    description: '30,000 simulated market paths in a Web Worker answer "will my SIP reach the goal?" with probabilities, not point estimates.',
    tags: ['TypeScript', 'Web Workers', 'Quant'], link: 'https://montecarlo-risk-dashboard.vercel.app', repoLink: 'https://github.com/samrht/montecarlo-risk-dashboard' }),
  P({ slug: 'siply-smart', title: 'SIPlySmart', universe: 'verse', featured: true,
    description: 'Invest with logic, not vibes: a multi-goal planner that shows the math and rates each goal 😱🙂😎.',
    tags: ['React', 'Vite', 'Fintech'], link: 'https://siplysmart.vercel.app', repoLink: 'https://github.com/samrht/SIPlySmart' }),
  P({ slug: 'ledger-investment-lab', title: 'Ledger', universe: 'verse', featured: false,
    description: 'Local-first investment lab: charts vs SPY, honest risk cards, watchlist with a thesis, portfolio lots.',
    tags: ['React', 'Zustand', 'Recharts'] }),
  P({ slug: 'investing-assistant', title: 'Investing Assistant', universe: 'verse', featured: false,
    description: 'NSE portfolio tracker with live LTP, XIRR, sector allocation and a watchlist with sparklines.',
    tags: ['FastAPI', 'React', 'yfinance'] }),
  P({ slug: 'discord-bot-template', title: 'Discord Bot Template', universe: 'verse', featured: false,
    description: 'Drop-in multifunctional bot: music, blackjack, moderation, modular cogs. Fork it, tear it down.',
    tags: ['Python', 'discord.py'], repoLink: 'https://github.com/samrht/discord-bot-template' }),
]

export function projectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}
```

- [ ] **Step 4: Write universes.ts, stills.ts, cover.ts**

`src/data/universes.ts`:
```ts
import type { Universe } from '../store/universeStore'

export interface UniverseDef {
  id: Universe
  chapter: { number: number; kicker: string; title: string; tagline: string }
  layout: 'splash' | 'grid'
  stillId: string
  caption: string
  sfx: string
  itemSlugs: string[]
}

export const UNIVERSES: readonly UniverseDef[] = [
  { id: '616', layout: 'splash', stillId: 'still-616-hero', sfx: 'THWIP!', itemSlugs: [],
    chapter: { number: 1, kicker: 'EARTH-616 · THE ORIGIN', title: 'ORIGINS', tagline: 'Bitten by a curiosity that never let go.' },
    caption: 'IT ALL STARTED WITH A SPREADSHEET…' },
  { id: 'mcu', layout: 'splash', stillId: 'still-mcu-hero', sfx: 'ACTIVATE.',
    itemSlugs: ['drishti', 'idea-lab', 'execution-os', 'research-agent', 'spider-verse-portfolio'],
    chapter: { number: 2, kicker: 'MCU · THE FLAGSHIP', title: 'FLAGSHIP', tagline: 'The big ones. Shipped, deployed, used.' },
    caption: 'MEANWHILE, IN ANOTHER UNIVERSE…' },
  { id: 'toon', layout: 'grid', stillId: 'still-toon-hero', sfx: 'WHAM!',
    itemSlugs: ['blackhole-sim', 'living-task-canvas', 'algo-trading-starter', 'productivity-dashboard', 'claude-design-system', 'transcript-tool'],
    chapter: { number: 3, kicker: 'SATURDAY MORNING · SIDE QUESTS', title: 'SIDE QUESTS', tagline: 'Experiments, toys, things built to find out.' },
    caption: 'LATER THAT SATURDAY…' },
  { id: 'verse', layout: 'grid', stillId: 'still-verse-hero', sfx: 'BOOM.',
    itemSlugs: ['founder-discovery', 'montecarlo-risk-dashboard', 'siply-smart', 'ledger-investment-lab', 'investing-assistant', 'discord-bot-template'],
    chapter: { number: 4, kicker: 'THE SPIDER-VERSE · EVERYTHING ELSE', title: 'THE MULTIVERSE', tagline: 'Anyone can wear the mask.' },
    caption: 'ACROSS THE SPIDER-VERSE…' },
]

export function universeById(id: Universe): UniverseDef {
  const u = UNIVERSES.find((x) => x.id === id)
  if (!u) throw new Error(`unknown universe ${id}`)
  return u
}
```

`src/data/stills.ts` (placeholders until Task 8 swaps in approved files — the `src` paths are the FINAL paths; Task 8 only drops files there):
```ts
import type { Universe } from '../store/universeStore'

export interface Still {
  id: string
  universeId: Universe | 'cover'
  src: string
  thumb: string
  alt: string
  credit: { title: string; owner: string }
}

// Shown when a still is missing or fails to load — never a broken image.
export const PAPER_FALLBACK = '/stills/paper-fallback.svg'

export const STILLS: readonly Still[] = [
  { id: 'still-cover', universeId: 'cover', src: '/stills/cover/cover.jpg', thumb: '/stills/cover/cover-thumb.jpg',
    alt: 'Spider-Man swinging between universes', credit: { title: 'The Amazing Spider-Man (cover art)', owner: 'Marvel Comics' } },
  { id: 'still-616-hero', universeId: '616', src: '/stills/616/hero.jpg', thumb: '/stills/616/hero-thumb.jpg',
    alt: 'Spider-Man, classic comic art', credit: { title: 'The Amazing Spider-Man', owner: 'Marvel Comics' } },
  { id: 'still-mcu-hero', universeId: 'mcu', src: '/stills/mcu/hero.jpg', thumb: '/stills/mcu/hero-thumb.jpg',
    alt: 'Spider-Man (Tom Holland) in the MCU', credit: { title: 'Spider-Man: No Way Home', owner: 'Sony Pictures / Marvel Studios' } },
  { id: 'still-toon-hero', universeId: 'toon', src: '/stills/toon/hero.jpg', thumb: '/stills/toon/hero-thumb.jpg',
    alt: 'Spider-Man, 1994 animated series', credit: { title: 'Spider-Man: The Animated Series', owner: 'Marvel Entertainment' } },
  { id: 'still-verse-hero', universeId: 'verse', src: '/stills/verse/hero.jpg', thumb: '/stills/verse/hero-thumb.jpg',
    alt: 'Miles Morales, Into the Spider-Verse', credit: { title: 'Spider-Man: Into the Spider-Verse', owner: 'Sony Pictures Animation' } },
]

export function stillById(id: string): Still | undefined {
  return STILLS.find((s) => s.id === id)
}
```

Create `public/stills/paper-fallback.svg` (a 1600×900 SVG: `#f4e8c8` background, a Ben-Day dot pattern, and the text `STILL PENDING` in Impact at 120 px, centred, `#1b1b1b`). Create empty dirs `public/stills/{cover,616,mcu,toon,verse}/.gitkeep`.

`src/data/cover.ts`:
```ts
import type { Universe } from '../store/universeStore'

export const COVER: {
  masthead: string; issue: string; price: string; stillId: string
  coverLines: { universeId: Universe; text: string }[]
} = {
  masthead: 'THE AMAZING SMARTH',
  issue: 'No. 1',
  price: '₹0 · FREE',
  stillId: 'still-cover',
  coverLines: [
    { universeId: '616', text: 'ORIGINS OF A BUILDER!' },
    { universeId: 'mcu', text: 'FIVE FLAGSHIPS, SHIPPED!' },
    { universeId: 'toon', text: 'SATURDAY SIDE QUESTS!' },
    { universeId: 'verse', text: 'ANYONE CAN WEAR THE MASK' },
  ],
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/data` → PASS (7 tests). The old `sections/*.tsx` still filter by `universe` — they compile because ids are valid; content shown is temporary until Task 5.

- [ ] **Step 6: Commit**

```bash
git add src/data public/stills
git commit -m "feat(comic): universe, still, cover and full project data with validation tests"
```

---

### Task 3: Panel primitives + ProjectFrame + comic.css base

**Files:**
- Create: `src/comic/primitives.tsx`, `src/comic/ProjectFrame.tsx`, `src/comic/ComicPanel.tsx`, `src/styles/comic.css`
- Test: `src/comic/__tests__/primitives.test.tsx`, `src/comic/__tests__/ComicPanel.test.tsx`

**Interfaces:**
- Consumes: `Project` (T2), `Still`, `PAPER_FALLBACK` (T2), `useUniverseStore` (T1), `useAudioStore` (existing: `getState().playFX('hover')`).
- Produces: `CaptionBox({ children, className? })`, `SpeechBubble({ children, tail?: 'left'|'right' })`, `SfxWord({ children })`, `Still({ still, eager?, className? })` (img with `onError` → `PAPER_FALLBACK`, `loading="lazy"` unless `eager`); `ProjectFrame({ project })`; `ComicPanel({ universe, children, className? })` renders `<section data-universe={universe} className="comic-panel …">` and calls `useUniverseStore.getState().setUniverse(universe)` when intersection ≥ 0.55.

- [ ] **Step 1: Write the failing tests**

`src/comic/__tests__/primitives.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CaptionBox, SpeechBubble, SfxWord, Still } from '../primitives'
import { ProjectFrame } from '../ProjectFrame'
import { PAPER_FALLBACK } from '../../data/stills'

vi.mock('../../store/audioStore', () => ({ useAudioStore: { getState: () => ({ playFX: vi.fn() }) } }))

const still = { id: 's', universeId: '616' as const, src: '/stills/616/hero.jpg', thumb: '/stills/616/hero-thumb.jpg', alt: 'Spidey', credit: { title: 'ASM', owner: 'Marvel' } }

describe('primitives', () => {
  it('CaptionBox / SpeechBubble / SfxWord render their text with the comic classes', () => {
    render(<><CaptionBox>MEANWHILE…</CaptionBox><SpeechBubble>Hi.</SpeechBubble><SfxWord>THWIP!</SfxWord></>)
    expect(screen.getByText('MEANWHILE…')).toHaveClass('comic-caption')
    expect(screen.getByText('Hi.')).toHaveClass('comic-bubble')
    expect(screen.getByText('THWIP!')).toHaveClass('comic-sfx')
  })
  it('Still lazy-loads by default, eager on request, and falls back to paper on error', () => {
    const { rerender } = render(<Still still={still} />)
    const img = screen.getByAltText('Spidey') as HTMLImageElement
    expect(img.getAttribute('loading')).toBe('lazy')
    expect(img.getAttribute('src')).toBe('/stills/616/hero.jpg')
    fireEvent.error(img)
    expect(img.getAttribute('src')).toBe(PAPER_FALLBACK)
    rerender(<Still still={still} eager />)
    expect(screen.getByAltText('Spidey').getAttribute('loading')).toBe('eager')
  })
})

describe('ProjectFrame', () => {
  const base = { id: 'x', slug: 'x', title: 'DRISHTI', description: 'sat', tags: ['Python', 'CLIP'], universe: 'mcu' as const, featured: true }
  it('links out when a link exists and renders as an article when it does not', () => {
    const { rerender } = render(<ProjectFrame project={{ ...base, link: 'https://x.dev' }} />)
    expect(screen.getByRole('link', { name: /DRISHTI/ })).toHaveAttribute('href', 'https://x.dev')
    rerender(<ProjectFrame project={base} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByRole('article')).toBeInTheDocument()
  })
  it('renders every tag', () => {
    render(<ProjectFrame project={base} />)
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByText('CLIP')).toBeInTheDocument()
  })
})
```

`src/comic/__tests__/ComicPanel.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ComicPanel } from '../ComicPanel'
import { useUniverseStore } from '../../store/universeStore'

type IOCallback = (entries: Partial<IntersectionObserverEntry>[]) => void
let lastCallback: IOCallback | null = null

beforeEach(() => {
  lastCallback = null
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: IOCallback) { lastCallback = cb }
    observe() {} disconnect() {} unobserve() {}
  })
  useUniverseStore.setState({ activeUniverse: '616' })
})

describe('ComicPanel', () => {
  it('renders a section with data-universe and the frame class', () => {
    render(<ComicPanel universe="mcu"><p>hi</p></ComicPanel>)
    const sec = screen.getByText('hi').closest('section')!
    expect(sec.getAttribute('data-universe')).toBe('mcu')
    expect(sec).toHaveClass('comic-panel')
  })
  it('sets the active universe once the panel dominates the viewport', () => {
    render(<ComicPanel universe="toon"><p>x</p></ComicPanel>)
    act(() => lastCallback!([{ intersectionRatio: 0.3 }]))
    expect(useUniverseStore.getState().activeUniverse).toBe('616')
    act(() => lastCallback!([{ intersectionRatio: 0.6 }]))
    expect(useUniverseStore.getState().activeUniverse).toBe('toon')
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/comic`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement primitives.tsx**

```tsx
import { useState } from 'react'
import type { ReactNode } from 'react'
import { PAPER_FALLBACK, type Still as StillDef } from '../data/stills'

// Small comic devices. All styling comes from comic.css via the skin contract.

export function CaptionBox({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`comic-caption ${className}`.trim()}>{children}</div>
}

export function SpeechBubble({ children, tail = 'left' }: { children: ReactNode; tail?: 'left' | 'right' }) {
  return <div className="comic-bubble" data-tail={tail}>{children}</div>
}

export function SfxWord({ children }: { children: ReactNode }) {
  return <span className="comic-sfx" aria-hidden="true">{children}</span>
}

// An official still. Falls back to the paper texture on load error so a
// missing file never shows a broken image.
export function Still({ still, eager = false, className = '' }: { still: StillDef; eager?: boolean; className?: string }) {
  const [src, setSrc] = useState(still.src)
  return (
    <img
      className={`comic-still ${className}`.trim()}
      src={src}
      alt={still.alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => { if (src !== PAPER_FALLBACK) setSrc(PAPER_FALLBACK) }}
    />
  )
}
```

- [ ] **Step 4: Implement ProjectFrame.tsx**

```tsx
import type { Project } from '../data/projects'
import { useAudioStore } from '../store/audioStore'

// One project as an ink-bordered comic frame. Links out when it can.
export function ProjectFrame({ project }: { project: Project }) {
  const href = project.link ?? project.repoLink
  const body = (
    <>
      <h3 className="comic-frame-title">{project.title}</h3>
      <p className="comic-frame-blurb">{project.description}</p>
      <ul className="comic-frame-tags" aria-label="Tech">
        {project.tags.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </>
  )
  const common = {
    className: 'comic-frame',
    'data-spider-sense': true,
    onMouseEnter: () => useAudioStore.getState().playFX('hover'),
  }
  return href
    ? <a {...common} href={href} target="_blank" rel="noopener noreferrer" aria-label={project.title}>{body}</a>
    : <article {...common}>{body}</article>
}
```

- [ ] **Step 5: Implement ComicPanel.tsx**

```tsx
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useUniverseStore, type Universe } from '../store/universeStore'

// The frame around one universe. Owns the data-universe scope for its
// subtree and reports itself as the active universe when it dominates the
// viewport (same IO rule UniverseShell used: ≥ 55%).
export function ComicPanel({ universe, children, className = '' }: { universe: Universe; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.intersectionRatio >= 0.55) useUniverseStore.getState().setUniverse(universe) },
      { threshold: [0, 0.25, 0.55, 0.75, 1] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [universe])
  return (
    <section ref={ref} id={`u-${universe}`} data-universe={universe} className={`comic-panel ${className}`.trim()} data-spider-sense>
      {children}
    </section>
  )
}
```

- [ ] **Step 6: Write comic.css (base)**

`src/styles/comic.css` — imported from `index.css` after the skins:
```css
/* Comic page — every rule uses the skin contract (--u-*), never raw colours.
 * Layout constants: --bugle-w from tokens.css keeps panels clear of the rail. */

.comic-page { position: relative; }

.comic-panel {
  position: relative;
  min-height: 100vh;
  margin: 0 3vw 0 calc(var(--bugle-w) + 3vw);
  border: var(--u-panel-border);
  box-shadow: var(--u-panel-shadow);
  background: var(--u-paper), var(--u-bg);
  color: var(--u-ink);
  font-family: var(--u-font-body);
  overflow: hidden;
  transition: margin-left 300ms ease;
}
.comic-panel[data-universe] { --u-scan-opacity: calc(var(--u-scanline) * 0.35); }
.comic-panel::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(0,0,0,var(--u-scan-opacity)) 0 1px, transparent 1px 3px);
  mix-blend-mode: multiply;
}

.comic-caption {
  display: inline-block; padding: 6px 10px;
  background: var(--u-caption-bg); color: var(--u-ink);
  border: 2px solid var(--u-ink); box-shadow: 3px 3px 0 var(--u-ink);
  font: 700 12px/1.3 var(--u-font-body); letter-spacing: .1em; text-transform: uppercase;
}
.comic-bubble {
  position: relative; display: inline-block; padding: 10px 14px; max-width: 42ch;
  background: #fff; color: #101010; border: 2px solid #101010; border-radius: 18px;
  font: 600 14px/1.35 var(--u-font-body);
}
.comic-bubble::after {
  content: ''; position: absolute; bottom: -12px; left: 22px;
  border: 8px solid transparent; border-top: 12px solid #101010;
}
.comic-bubble[data-tail="right"]::after { left: auto; right: 22px; }
.comic-sfx {
  display: inline-block; font: 900 clamp(28px, 4vw, 56px)/1 var(--u-font-display);
  color: var(--u-accent); -webkit-text-stroke: 2px var(--u-ink); text-shadow: 4px 4px 0 var(--u-accent-2);
  transform: rotate(-8deg); letter-spacing: .02em;
}
.comic-still { display: block; width: 100%; height: 100%; object-fit: cover; }

.comic-frame {
  display: block; padding: 16px; text-decoration: none;
  background: rgba(255,255,255,.92); color: #101010;
  border: 2px solid #101010; box-shadow: 4px 4px 0 #101010;
  transition: transform var(--u-duration) var(--u-ease), box-shadow var(--u-duration) var(--u-ease);
}
.comic-frame:hover { transform: translateY(-4px); box-shadow: 6px 8px 0 #101010; }
.comic-frame-title { margin: 0 0 6px; font: 900 22px/1.05 var(--u-font-display); letter-spacing: .02em; }
.comic-frame-blurb { margin: 0 0 10px; font-size: 13px; line-height: 1.45; }
.comic-frame-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.comic-frame-tags li { padding: 2px 6px; border: 1px solid #101010; font: 700 10px/1.4 var(--u-font-body); letter-spacing: .08em; text-transform: uppercase; }

@media (max-width: 767px) {
  .comic-panel { margin: 0 12px; }
}
```

- [ ] **Step 7: Run tests, lint, build**

Run: `npx vitest run src/comic` → PASS (5 tests). `npx eslint src/comic src/styles` clean (`src/styles` may need to be omitted from the eslint path if ESLint 10 refuses a CSS-only folder — then lint `src/comic` only). `npm run build` passes.

- [ ] **Step 8: Commit**

```bash
git add src/comic src/styles/comic.css src/index.css
git commit -m "feat(comic): panel frame, caption/bubble/sfx/still primitives and ProjectFrame"
```

---

### Task 4: SplashPanel + GridPanel (static)

**Files:**
- Create: `src/comic/SplashPanel.tsx`, `src/comic/GridPanel.tsx`, `src/data/bio.ts`
- Modify: `src/styles/comic.css` (append layout rules)
- Test: `src/comic/__tests__/panels.test.tsx`

**Interfaces:**
- Consumes: `ComicPanel`, primitives, `ProjectFrame` (T3); `universeById`, `stillById`, `projectBySlug` (T2).
- Produces: `SplashPanel({ universe })`, `GridPanel({ universe })` — each renders its own `ComicPanel`; `BIO: { name: string; lines: string[]; links: { label: string; href: string }[] }`. Motion hooks are attached in Task 7 via `data-motion` attributes: `data-motion="parallax"` on the still wrapper, `data-motion="enter"` on each staggered child, `data-motion="frame"` on grid frames.

- [ ] **Step 1: Write the failing test**

`src/comic/__tests__/panels.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { SplashPanel } from '../SplashPanel'
import { GridPanel } from '../GridPanel'
import { universeById } from '../../data/universes'

vi.mock('../../store/audioStore', () => ({ useAudioStore: { getState: () => ({ playFX: vi.fn() }) } }))
vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} })

describe('SplashPanel', () => {
  it('616 shows the bio, the chapter title and the still', () => {
    render(<SplashPanel universe="616" />)
    expect(screen.getByRole('heading', { level: 2, name: 'ORIGINS' })).toBeInTheDocument()
    expect(screen.getByAltText(/classic comic art/i)).toBeInTheDocument()
    expect(screen.getByTestId('focus-bio')).toBeInTheDocument()
  })
  it('mcu shows the first flagship project as the focus block and lists the rest', () => {
    render(<SplashPanel universe="mcu" />)
    const mcu = universeById('mcu')
    expect(screen.getByTestId('focus-project')).toHaveTextContent('DRISHTI')
    const rest = screen.getByTestId('splash-rest')
    expect(within(rest).getAllByRole('listitem')).toHaveLength(mcu.itemSlugs.length - 1)
  })
})

describe('GridPanel', () => {
  it('renders one frame per item plus the bubble and sfx word', () => {
    render(<GridPanel universe="toon" />)
    const toon = universeById('toon')
    expect(screen.getAllByTestId('grid-frame')).toHaveLength(toon.itemSlugs.length)
    expect(screen.getByText(toon.chapter.tagline)).toHaveClass('comic-bubble')
    expect(screen.getByText(toon.sfx)).toHaveClass('comic-sfx')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/comic/__tests__/panels.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write bio.ts**

`src/data/bio.ts`:
```ts
export const BIO = {
  name: 'Smarth',
  lines: [
    'Builds things that answer real questions — satellite change detection, ranked execution, honest finance math.',
    'Ships on Sundays, commits at 3 a.m., and won\'t let a fixed-return assumption near a forecast.',
    'Currently: DRISHTI, Idea Lab, and this comic book.',
  ],
  links: [
    { label: 'GitHub', href: 'https://github.com/samrht' },
    { label: 'Email', href: 'mailto:smarthshokeen08@gmail.com' },
  ],
}
```

- [ ] **Step 4: Implement SplashPanel.tsx**

```tsx
import { ComicPanel } from './ComicPanel'
import { CaptionBox, Still } from './primitives'
import { ProjectFrame } from './ProjectFrame'
import { universeById } from '../data/universes'
import { stillById } from '../data/stills'
import { projectBySlug } from '../data/projects'
import { BIO } from '../data/bio'
import type { Universe } from '../store/universeStore'

// Splash layout: one full-bleed still on one side, the chapter on the other
// with a single focus block (bio for 616, the first flagship for mcu), and
// a corner caption. Motion attributes are read by comic/motion.ts.
export function SplashPanel({ universe }: { universe: Universe }) {
  const u = universeById(universe)
  const still = stillById(u.stillId)!
  const items = u.itemSlugs.map(projectBySlug).filter((p): p is NonNullable<typeof p> => !!p)
  const [focus, ...rest] = items
  const stillRight = universe === 'mcu'

  return (
    <ComicPanel universe={universe} className={`splash ${stillRight ? 'splash-still-right' : ''}`.trim()}>
      <div className="splash-still" data-motion="parallax">
        <Still still={still} eager={universe === '616'} />
      </div>
      <div className="splash-body">
        <p className="comic-kicker" data-motion="enter">{u.chapter.kicker}</p>
        <h2 className="comic-title" data-motion="enter">{u.chapter.title}</h2>
        <p className="comic-tagline" data-motion="enter">{u.chapter.tagline}</p>
        {universe === '616' ? (
          <div className="splash-focus" data-testid="focus-bio" data-motion="enter">
            {BIO.lines.map((l) => <p key={l}>{l}</p>)}
            <p className="splash-links">{BIO.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>)}</p>
          </div>
        ) : focus ? (
          <div className="splash-focus" data-testid="focus-project" data-motion="enter"><ProjectFrame project={focus} /></div>
        ) : null}
        {rest.length > 0 && (
          <ul className="splash-rest" data-testid="splash-rest" data-motion="enter">
            {rest.map((p) => <li key={p.slug}><a href={p.link ?? p.repoLink ?? '#'} target="_blank" rel="noopener noreferrer">{p.title}</a><span>{p.tags[0]}</span></li>)}
          </ul>
        )}
      </div>
      <CaptionBox className="splash-caption">{u.caption}</CaptionBox>
    </ComicPanel>
  )
}
```

- [ ] **Step 5: Implement GridPanel.tsx**

```tsx
import { ComicPanel } from './ComicPanel'
import { SfxWord, SpeechBubble, Still } from './primitives'
import { ProjectFrame } from './ProjectFrame'
import { universeById } from '../data/universes'
import { stillById } from '../data/stills'
import { projectBySlug } from '../data/projects'
import type { Universe } from '../store/universeStore'

// Grid layout: the panel is itself a comic page — still sub-panel, title +
// speech bubble, then project frames in rows of three that land in reading
// order (motion in comic/motion.ts). The sfx word pops on the first frame.
export function GridPanel({ universe }: { universe: Universe }) {
  const u = universeById(universe)
  const still = stillById(u.stillId)!
  const items = u.itemSlugs.map(projectBySlug).filter((p): p is NonNullable<typeof p> => !!p)

  return (
    <ComicPanel universe={universe} className="grid">
      <div className="grid-still" data-motion="enter"><Still still={still} /></div>
      <div className="grid-head" data-motion="enter">
        <p className="comic-kicker">{u.chapter.kicker}</p>
        <h2 className="comic-title">{u.chapter.title}</h2>
        <SpeechBubble>{u.chapter.tagline}</SpeechBubble>
      </div>
      <ul className="grid-frames">
        {items.map((p, i) => (
          <li key={p.slug} data-testid="grid-frame" data-motion="frame" className="grid-frame">
            {i === 0 && <SfxWord>{u.sfx}</SfxWord>}
            <ProjectFrame project={p} />
          </li>
        ))}
      </ul>
    </ComicPanel>
  )
}
```

- [ ] **Step 6: Append layout CSS to comic.css**

```css
/* — Splash — */
.comic-panel.splash { display: grid; grid-template-columns: 1fr 1fr; grid-template-areas: 'still body'; }
.comic-panel.splash-still-right { grid-template-areas: 'body still'; }
.splash-still { grid-area: still; position: relative; overflow: hidden; border-right: var(--u-panel-border); }
.splash-still-right .splash-still { border-right: 0; border-left: var(--u-panel-border); }
.splash-still .comic-still { transform: scale(1.12); will-change: transform; }
.splash-body { grid-area: body; padding: clamp(24px, 6vw, 72px); display: flex; flex-direction: column; justify-content: center; gap: 14px; }
.comic-kicker { margin: 0; font: 700 12px/1 var(--u-font-body); letter-spacing: .2em; opacity: .75; }
.comic-title { margin: 0; font: 900 clamp(44px, 7vw, 104px)/.95 var(--u-font-display); letter-spacing: .02em; text-shadow: 4px 4px 0 var(--u-accent-2); }
[data-universe="mcu"] .comic-title { text-shadow: none; letter-spacing: .12em; font-weight: 600; }
[data-universe="verse"] .comic-title { text-shadow: -3px 0 var(--u-accent-2), 3px 0 var(--u-accent); transform: rotate(-2deg); }
.comic-tagline { margin: 0; font-size: clamp(16px, 1.6vw, 22px); line-height: 1.4; max-width: 46ch; }
.splash-focus { margin-top: 8px; max-width: 60ch; }
.splash-focus p { margin: 0 0 8px; line-height: 1.5; }
.splash-links a { margin-right: 14px; color: var(--u-accent); font-weight: 700; }
.splash-rest { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.splash-rest li { display: flex; justify-content: space-between; border-bottom: 1px dashed var(--u-ink); padding: 4px 0; font-size: 14px; }
.splash-rest a { color: inherit; font-weight: 700; text-decoration: none; }
.splash-rest span { opacity: .6; font-size: 11px; letter-spacing: .1em; }
.splash-caption { position: absolute; left: 24px; bottom: 24px; }

/* — Grid — */
.comic-panel.grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 20px; padding: clamp(24px, 5vw, 64px); }
.grid-still { grid-column: span 5; aspect-ratio: 4 / 3; border: var(--u-panel-border); box-shadow: var(--u-panel-shadow); overflow: hidden; }
.grid-head { grid-column: span 7; display: flex; flex-direction: column; justify-content: center; gap: 12px; }
.grid-frames { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 0; padding: 0; list-style: none; }
.grid-frame { position: relative; }
.grid-frame .comic-sfx { position: absolute; right: -10px; top: -28px; z-index: 2; }

@media (max-width: 767px) {
  .comic-panel.splash, .comic-panel.splash-still-right { grid-template-columns: 1fr; grid-template-areas: 'still' 'body'; }
  .splash-still { aspect-ratio: 16 / 9; border-right: 0; border-bottom: var(--u-panel-border); }
  .splash-still-right .splash-still { border-left: 0; }
  .splash-still .comic-still { transform: none; }
  .grid-still, .grid-head, .grid-frames { grid-column: 1 / -1; }
  .grid-frames { grid-template-columns: 1fr; }
  .splash-caption { position: static; margin: 0 24px 24px; }
}
```

- [ ] **Step 7: Run tests, lint, build; commit**

Run: `npx vitest run src/comic` → PASS. `npx eslint src/comic src/data` clean. `npm run build` passes.
```bash
git add src/comic src/data/bio.ts src/styles/comic.css
git commit -m "feat(comic): splash and grid panel layouts"
```

---

### Task 5: Gutter, Cover, NextIssue (static) + Home assembly + old page removed

**Files:**
- Create: `src/comic/Gutter.tsx`, `src/comic/Cover.tsx`, `src/comic/NextIssue.tsx`
- Modify: `src/pages/Home.tsx` (rewrite), `src/styles/comic.css` (append), `src/index.css` (drop `sections.css` import if present), `src/styles/animations.css:62` (drop the `.decor-*` rule)
- Delete: `src/sections/Earth1610.tsx`, `Earth65.tsx`, `Earth138.tsx`, `Earth928.tsx`, `LockedPortals.tsx`, `src/components/UniverseShell.tsx`, `src/engine/universeTransition.ts`, `src/engine/halftoneLoader.ts`, `src/styles/sections.css`, `src/components/ProjectCard.tsx` (replaced by `ProjectFrame`; check `grep -rn ProjectCard src` shows no other users first)
- Test: `src/comic/__tests__/cover.test.tsx`, `src/comic/__tests__/nextIssue.test.tsx`

**Interfaces:**
- Consumes: T2 data, T3/T4 components, `useSuitStore` (existing `openSuit`), `useAudioStore`.
- Produces: `Gutter({ caption, universe })` renders `<div className="comic-gutter" data-universe={universe} data-motion="gutter"><CaptionBox data-motion="caption">…</CaptionBox></div>` where `universe` is the FOLLOWING panel's id (so the caption takes that skin); `Cover()` renders `<section className="comic-cover" data-universe="616" data-motion="cover">`; `NextIssue()` renders contact, `StillCredits`, and the teaser stamps; `Home` renders `Cover → [SplashPanel/GridPanel + Gutter]… → NextIssue` inside `<main className="comic-page">` plus the fixed chrome. Keeps `?nointro` accepted (no-op now) so old links work.

- [ ] **Step 1: Write the failing tests**

`src/comic/__tests__/cover.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Cover } from '../Cover'
import { COVER } from '../../data/cover'

describe('Cover', () => {
  it('renders masthead, issue, an eager cover still and four cover-line anchors', () => {
    render(<Cover />)
    expect(screen.getByRole('heading', { level: 1, name: COVER.masthead })).toBeInTheDocument()
    expect(screen.getByText(COVER.issue)).toBeInTheDocument()
    expect((screen.getByAltText(/swinging/i) as HTMLImageElement).getAttribute('loading')).toBe('eager')
    const links = screen.getAllByRole('link', { name: /!|MASK/ })
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#u-616', '#u-mcu', '#u-toon', '#u-verse'])
  })
})
```

`src/comic/__tests__/nextIssue.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIssue } from '../NextIssue'
import { STILLS } from '../../data/stills'

vi.mock('../../store/suitStore', () => ({ useSuitStore: (sel: (s: { openSuit: () => void }) => unknown) => sel({ openSuit: vi.fn() }) }))

describe('NextIssue', () => {
  it('credits every still and shows the takedown note', () => {
    render(<NextIssue />)
    for (const s of STILLS) expect(screen.getByText(new RegExp(s.credit.title))).toBeInTheDocument()
    expect(screen.getByText(/not affiliated/i)).toBeInTheDocument()
  })
  it('shows the next-issue teasers and the contact links', () => {
    render(<NextIssue />)
    expect(screen.getAllByText(/NEXT ISSUE/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/comic/__tests__/cover.test.tsx src/comic/__tests__/nextIssue.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement Gutter.tsx**

```tsx
import { CaptionBox } from './primitives'
import type { Universe } from '../store/universeStore'

// The seam between two panels: a black band carrying the next panel's
// caption. `universe` is the FOLLOWING panel so the caption wears its skin.
// comic/motion.ts drives the tilt-and-settle + caption slide off scroll.
export function Gutter({ caption, universe }: { caption: string; universe: Universe }) {
  return (
    <div className="comic-gutter" data-universe={universe} data-motion="gutter" aria-hidden="true">
      <div className="comic-gutter-caption" data-motion="caption"><CaptionBox>{caption}</CaptionBox></div>
    </div>
  )
}
```

- [ ] **Step 4: Implement Cover.tsx**

```tsx
import { COVER } from '../data/cover'
import { stillById } from '../data/stills'
import { Still } from './primitives'

// Issue #1 cover: first viewport. Cover lines anchor to the panels. The
// page-lift (Task 7) pins this section briefly and rotates it away.
export function Cover() {
  const still = stillById(COVER.stillId)!
  return (
    <section className="comic-cover" data-universe="616" data-motion="cover" aria-label="Cover">
      <header className="cover-masthead">
        <h1>{COVER.masthead}</h1>
        <p className="cover-issue"><span>{COVER.issue}</span><span>{COVER.price}</span></p>
      </header>
      <div className="cover-still"><Still still={still} eager /></div>
      <ul className="cover-lines">
        {COVER.coverLines.map((c) => (
          <li key={c.universeId}><a href={`#u-${c.universeId}`}>{c.text}</a></li>
        ))}
      </ul>
      <p className="cover-hint" aria-hidden="true">SCROLL TO OPEN ▼</p>
    </section>
  )
}
```

- [ ] **Step 5: Implement NextIssue.tsx**

```tsx
import { STILLS } from '../data/stills'
import { BIO } from '../data/bio'
import { useSuitStore } from '../store/suitStore'

const TEASERS = ['THE STORY', 'THE MISSION', 'THE MULTIVERSE', 'CYBERSPIDER']

// Back cover: contact, still credits + takedown note, and the old locked
// portals as "NEXT ISSUE" stamps. The Suit HUD launchpad lives here too so
// it keeps a home when the visitor is outside the MCU panel.
export function NextIssue() {
  const openSuit = useSuitStore((s) => s.openSuit)
  return (
    <section className="comic-back" data-universe="verse" aria-label="Back cover">
      <div className="back-contact">
        <h2 className="comic-title">TO BE CONTINUED…</h2>
        <p>Want to build something? The mask is on the desk.</p>
        <p className="splash-links">{BIO.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>)}</p>
        <button type="button" className="back-suit" onClick={() => void openSuit()} data-spider-sense>[ INITIALIZE SUIT SYSTEMS ]</button>
      </div>
      <ul className="back-teasers" aria-label="Next issue">
        {TEASERS.map((t) => <li key={t}><span className="back-stamp">NEXT ISSUE</span>{t}</li>)}
      </ul>
      <aside className="back-credits">
        <h3>Still credits</h3>
        <ul>{STILLS.map((s) => <li key={s.id}>{s.credit.title} — © {s.credit.owner}</li>)}</ul>
        <p>Personal portfolio — not affiliated with Marvel, Sony, Disney or any studio listed. Stills are shown as fan tribute; if you're a rights holder and want one removed, reach out via the links above.</p>
      </aside>
    </section>
  )
}
```

- [ ] **Step 6: Rewrite Home.tsx**

```tsx
import { lazy, Suspense, useEffect } from 'react'
import { Cover } from '../comic/Cover'
import { SplashPanel } from '../comic/SplashPanel'
import { GridPanel } from '../comic/GridPanel'
import { Gutter } from '../comic/Gutter'
import { NextIssue } from '../comic/NextIssue'
import { UNIVERSES } from '../data/universes'
import '../styles/comic.css'

// Fixed chrome stays lazy so GSAP/Howler stay off the critical path.
const DailyBugle = lazy(() => import('../components/DailyBugle').then((m) => ({ default: m.DailyBugle })))
const KarenHUD = lazy(() => import('../components/KarenHUD').then((m) => ({ default: m.KarenHUD })))
const SymbioteToggle = lazy(() => import('../components/SymbioteToggle').then((m) => ({ default: m.SymbioteToggle })))
const BugleOverlay = lazy(() => import('../components/BugleOverlay').then((m) => ({ default: m.BugleOverlay })))
const SuitHUD = lazy(() => import('../components/SuitHUD/SuitHUD').then((m) => ({ default: m.SuitHUD })))

// Home is a comic book: cover, four universe panels joined by gutters, back
// cover. Cursor + spider-sense + Lenis are dynamic-imported after mount.
export function Home() {
  useEffect(() => {
    let teardownCursor: (() => void) | null = null
    let teardownSense: (() => void) | null = null
    let cancelled = false
    Promise.all([import('../engine/webCursor'), import('../engine/spiderSense')]).then(([c, s]) => {
      if (cancelled) return
      teardownCursor = c.initCursor()
      teardownSense = s.initSpiderSense()
    })
    return () => { cancelled = true; teardownCursor?.(); teardownSense?.() }
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let teardown: (() => void) | null = null
    let cancelled = false
    import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return
      const lenis = new Lenis({ duration: 1.1, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true })
      let raf = 0
      const tick = (time: number) => { lenis.raf(time); raf = requestAnimationFrame(tick) }
      raf = requestAnimationFrame(tick)
      teardown = () => { cancelAnimationFrame(raf); lenis.destroy() }
    })
    return () => { cancelled = true; teardown?.() }
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <DailyBugle />
        <KarenHUD />
        <SymbioteToggle />
        <BugleOverlay />
        <SuitHUD />
      </Suspense>
      <main className="comic-page">
        <Cover />
        {UNIVERSES.map((u, i) => (
          <div key={u.id} className="comic-spread">
            {i > 0 && <Gutter caption={u.caption} universe={u.id} />}
            {u.layout === 'splash' ? <SplashPanel universe={u.id} /> : <GridPanel universe={u.id} />}
          </div>
        ))}
        <NextIssue />
      </main>
    </>
  )
}
```
(The 616 panel's own caption is rendered inside `SplashPanel`; gutters carry the *following* panel's caption, so the first panel has no gutter.)

- [ ] **Step 7: Append gutter/cover/back CSS**

```css
/* — Gutter — */
.comic-spread { position: relative; }
.comic-gutter { position: relative; height: 8vh; background: #101010; margin: 0 3vw 0 calc(var(--bugle-w) + 3vw); display: flex; align-items: center; padding-left: 4vw; }
.comic-gutter-caption { transform: translateX(-120%); }

/* — Cover — */
.comic-cover {
  position: relative; min-height: 100vh; margin: 0 3vw 0 calc(var(--bugle-w) + 3vw);
  border: var(--u-panel-border); box-shadow: var(--u-panel-shadow);
  background: var(--u-paper), var(--u-bg); color: var(--u-ink);
  display: grid; grid-template-rows: auto 1fr auto; transform-origin: left center; will-change: transform;
}
.cover-masthead { padding: 24px 32px 8px; display: flex; align-items: baseline; justify-content: space-between; border-bottom: 3px solid var(--u-ink); }
.cover-masthead h1 { margin: 0; font: 900 clamp(36px, 6vw, 88px)/1 var(--u-font-display); letter-spacing: .04em; color: var(--u-accent); text-shadow: 4px 4px 0 var(--u-ink); }
.cover-issue { display: flex; gap: 18px; font: 700 12px/1 var(--u-font-body); letter-spacing: .2em; }
.cover-still { position: relative; overflow: hidden; }
.cover-lines { margin: 0; padding: 18px 32px; list-style: none; display: flex; gap: 14px; flex-wrap: wrap; border-top: 3px solid var(--u-ink); }
.cover-lines a { display: inline-block; padding: 8px 12px; background: var(--u-caption-bg); border: 2px solid var(--u-ink); box-shadow: 3px 3px 0 var(--u-ink); color: var(--u-ink); font: 900 14px/1 var(--u-font-display); letter-spacing: .06em; text-decoration: none; transform: rotate(-1.5deg); }
.cover-lines li:nth-child(even) a { transform: rotate(1.5deg); }
.cover-hint { position: absolute; right: 32px; bottom: 90px; margin: 0; font: 700 11px/1 var(--u-font-body); letter-spacing: .25em; opacity: .7; }

/* — Back cover — */
.comic-back { margin: 8vh 3vw 6vh calc(var(--bugle-w) + 3vw); border: var(--u-panel-border); box-shadow: var(--u-panel-shadow); background: var(--u-paper), var(--u-bg); color: var(--u-ink); padding: clamp(24px, 5vw, 64px); display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
.back-contact p { max-width: 50ch; }
.back-suit { margin-top: 12px; padding: 10px 16px; background: transparent; border: 2px solid var(--u-accent-2); color: var(--u-accent-2); font: 700 12px/1 var(--u-font-body); letter-spacing: .15em; cursor: pointer; }
.back-teasers { margin: 0; padding: 0; list-style: none; display: grid; gap: 12px; align-content: start; }
.back-teasers li { position: relative; padding: 18px; border: 2px dashed var(--u-ink); font: 900 20px/1 var(--u-font-display); letter-spacing: .04em; opacity: .85; }
.back-stamp { position: absolute; right: 10px; top: -10px; padding: 3px 8px; background: var(--u-accent); color: #fff; border: 2px solid var(--u-ink); font: 900 10px/1 var(--u-font-body); letter-spacing: .2em; transform: rotate(6deg); }
.back-credits { grid-column: 1 / -1; font-size: 12px; opacity: .8; border-top: 1px dashed var(--u-ink); padding-top: 16px; }
.back-credits ul { padding-left: 18px; }

@media (max-width: 767px) {
  .comic-gutter, .comic-cover, .comic-back { margin-left: 12px; margin-right: 12px; }
  .comic-back { grid-template-columns: 1fr; }
  .cover-masthead { flex-direction: column; gap: 8px; }
}
```

- [ ] **Step 8: Remove the old page**

`git rm src/sections/Earth1610.tsx src/sections/Earth65.tsx src/sections/Earth138.tsx src/sections/Earth928.tsx src/sections/LockedPortals.tsx src/components/UniverseShell.tsx src/engine/universeTransition.ts src/engine/halftoneLoader.ts src/styles/sections.css` and `src/components/ProjectCard.tsx` (after confirming `grep -rn "ProjectCard" src` has no other users). Remove the `sections.css` import from wherever it is imported (`grep -rn sections.css src index.html`). Remove the `.decor-earth-928` / `.decor-mcu` rule in `animations.css`. `grep -rn "halftoneLoader\|universeTransition\|UniverseShell\|LockedPortals" src` must be empty. The `shaders/glitch.frag` and `shaders/halftone.frag` files stay (verse flourish reuses `glitch.frag` in Task 7; `halftone.frag` may be deleted if nothing imports it).

- [ ] **Step 9: Run tests, build, lint; manual check**

`npx vitest run` all green; `npm run build`; `npx eslint src/comic src/pages src/data`. `npm run dev` → `/`: cover, four panels with gutters and captions (static), back cover; Bugle rail still on the left; `?nointro` harmless; no console errors; keyboard-tab through cover lines jumps to panels. Phone width: single column.

- [ ] **Step 10: Commit**

```bash
git add -A src
git commit -m "feat(comic): cover, gutters, back cover; home page assembled; old sections, loader and glitch transition removed"
```

---

### Task 6: Fixed chrome re-theme + PageIndex

**Files:**
- Create: `src/components/BugleSkin.tsx`, `src/comic/PageIndex.tsx`, `src/comic/pageIndex.ts` (pure helpers)
- Modify: `src/pages/Home.tsx` (mount `BugleSkin` instead of `DailyBugle`; MCU-only KAREN; mount `PageIndex`), `src/styles/bugle.css` (append four presentation blocks), `src/styles/karen.css` (fade class), `src/engine/webCursor.ts` (use `--u-ink`/`--u-accent` with legacy fallbacks; drop the two `[data-universe="toon"]` special-cases only if the new tokens make them redundant — keep otherwise), `src/styles/comic.css` (page index styles)
- Test: `src/comic/__tests__/pageIndex.test.ts`, `src/components/__tests__/BugleSkin.test.tsx`, `src/pages/__tests__/homeChrome.test.tsx`

**Interfaces:**
- Consumes: `UNIVERSE_IDS`, `useUniverseStore` (T1), `universeById`, `stillById` (T2), `DailyBugle` (existing, unchanged internals).
- Produces: `nextUniverse(current, dir: 1 | -1): Universe` (clamped, no wrap), `labelFor(id): string` (`'616' → 'EARTH-616'`, `'mcu' → 'MCU'`, `'toon' → 'SATURDAY MORNING'`, `'verse' → 'SPIDER-VERSE'`), `pageOf(id): number` (1-based); `PageIndex()` fixed bottom-left, `p.N/4 · LABEL`, fan-out on hover/focus with four thumbnails (`still.thumb`), click → `document.getElementById('u-<id>')?.scrollIntoView({ behavior: 'smooth' })` (Lenis intercepts native smooth scroll fine), `←/→` keys call `nextUniverse` and scroll (ignored when focus is in an input/textarea); `BugleSkin()` renders `<div className="bugle-skin" data-skin={activeUniverse}><DailyBugle /></div>` — the four presentations are CSS on `.bugle-skin[data-skin]` (616 newsprint masthead, mcu ticker strip, toon TV bumper, verse = current look untouched); `KarenHUD` wrapper in Home renders only when `activeUniverse === 'mcu'` with a 300 ms opacity fade class.

- [ ] **Step 1: Write the failing tests**

`src/comic/__tests__/pageIndex.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { nextUniverse, labelFor, pageOf } from '../pageIndex'

describe('pageIndex helpers', () => {
  it('steps through story order without wrapping', () => {
    expect(nextUniverse('616', 1)).toBe('mcu')
    expect(nextUniverse('verse', 1)).toBe('verse')
    expect(nextUniverse('616', -1)).toBe('616')
    expect(nextUniverse('toon', -1)).toBe('mcu')
  })
  it('labels and page numbers', () => {
    expect(labelFor('616')).toBe('EARTH-616')
    expect(labelFor('verse')).toBe('SPIDER-VERSE')
    expect(pageOf('616')).toBe(1)
    expect(pageOf('verse')).toBe(4)
  })
})
```

`src/components/__tests__/BugleSkin.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { BugleSkin } from '../BugleSkin'
import { useUniverseStore } from '../../store/universeStore'

vi.mock('../DailyBugle', () => ({ DailyBugle: () => <aside data-testid="bugle" /> }))

describe('BugleSkin', () => {
  it('exposes the active universe as data-skin', () => {
    useUniverseStore.setState({ activeUniverse: 'mcu' })
    const { container, rerender } = render(<BugleSkin />)
    expect(container.querySelector('.bugle-skin')!.getAttribute('data-skin')).toBe('mcu')
    useUniverseStore.setState({ activeUniverse: 'toon' })
    rerender(<BugleSkin />)
    expect(container.querySelector('.bugle-skin')!.getAttribute('data-skin')).toBe('toon')
  })
})
```

`src/pages/__tests__/homeChrome.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useUniverseStore } from '../../store/universeStore'

vi.mock('../../components/DailyBugle', () => ({ DailyBugle: () => null }))
vi.mock('../../components/BugleOverlay', () => ({ BugleOverlay: () => null }))
vi.mock('../../components/SuitHUD/SuitHUD', () => ({ SuitHUD: () => null }))
vi.mock('../../components/SymbioteToggle', () => ({ SymbioteToggle: () => null }))
vi.mock('../../components/KarenHUD', () => ({ KarenHUD: () => <div data-testid="karen" /> }))
vi.mock('../../store/audioStore', () => ({ useAudioStore: { getState: () => ({ playFX: vi.fn() }) } }))
vi.mock('lenis', () => ({ default: class { raf() {} destroy() {} } }))
vi.mock('../../engine/webCursor', () => ({ initCursor: () => () => {} }))
vi.mock('../../engine/spiderSense', () => ({ initSpiderSense: () => () => {} }))
vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} })

import { Home } from '../Home'

describe('Home chrome', () => {
  it('shows KAREN only in the MCU universe and the page index everywhere', async () => {
    useUniverseStore.setState({ activeUniverse: '616' })
    const { rerender } = render(<MemoryRouter><Home /></MemoryRouter>)
    expect(screen.getByText(/p\.1\/4/)).toBeInTheDocument()
    expect(screen.queryByTestId('karen')).toBeNull()
    useUniverseStore.setState({ activeUniverse: 'mcu' })
    rerender(<MemoryRouter><Home /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('karen')).toBeInTheDocument())
    expect(screen.getByText(/p\.2\/4/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/comic/__tests__/pageIndex.test.ts src/components/__tests__/BugleSkin.test.tsx src/pages/__tests__/homeChrome.test.tsx`
Expected: FAIL — modules not found / KAREN always present.

- [ ] **Step 3: Implement pageIndex.ts and PageIndex.tsx**

`src/comic/pageIndex.ts`:
```ts
import { UNIVERSE_IDS, type Universe } from '../store/universeStore'

const LABEL: Record<Universe, string> = { '616': 'EARTH-616', mcu: 'MCU', toon: 'SATURDAY MORNING', verse: 'SPIDER-VERSE' }

export function labelFor(id: Universe): string { return LABEL[id] }
export function pageOf(id: Universe): number { return UNIVERSE_IDS.indexOf(id) + 1 }
export function nextUniverse(current: Universe, dir: 1 | -1): Universe {
  const i = UNIVERSE_IDS.indexOf(current)
  const j = Math.min(UNIVERSE_IDS.length - 1, Math.max(0, i + dir))
  return UNIVERSE_IDS[j]
}
export function scrollToUniverse(id: Universe): void {
  document.getElementById(`u-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
```

`src/comic/PageIndex.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { UNIVERSE_IDS, useUniverseStore } from '../store/universeStore'
import { universeById } from '../data/universes'
import { stillById } from '../data/stills'
import { labelFor, nextUniverse, pageOf, scrollToUniverse } from './pageIndex'

// Fixed page number that doubles as the universe nav. Hover/focus fans out
// four thumbnails; ←/→ flip pages. Bottom-left (KAREN owns bottom-right).
export function PageIndex() {
  const active = useUniverseStore((s) => s.activeUniverse)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight') scrollToUniverse(nextUniverse(useUniverseStore.getState().activeUniverse, 1))
      if (e.key === 'ArrowLeft') scrollToUniverse(nextUniverse(useUniverseStore.getState().activeUniverse, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <nav className={`page-index ${open ? 'is-open' : ''}`} aria-label="Universes"
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false) }}>
      <button type="button" className="page-index-label" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="page-index-num">p.{pageOf(active)}/{UNIVERSE_IDS.length}</span>
        <span className="page-index-name"> · {labelFor(active)}</span>
      </button>
      <ul className="page-index-fan">
        {UNIVERSE_IDS.map((id) => {
          const u = universeById(id)
          const still = stillById(u.stillId)
          return (
            <li key={id} data-universe={id}>
              <button type="button" onClick={() => { scrollToUniverse(id); setOpen(false) }} aria-current={id === active} data-spider-sense>
                {still && <img src={still.thumb} alt="" loading="lazy" />}
                <span>p.{pageOf(id)} {labelFor(id)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 4: Implement BugleSkin.tsx and CSS**

`src/components/BugleSkin.tsx`:
```tsx
import { DailyBugle } from './DailyBugle'
import { useUniverseStore } from '../store/universeStore'

// Wraps the unchanged Daily Bugle rail and exposes the active universe as
// data-skin so bugle.css can present the same headlines four ways.
export function BugleSkin() {
  const active = useUniverseStore((s) => s.activeUniverse)
  return <div className="bugle-skin" data-skin={active}><DailyBugle /></div>
}
```

Append to `src/styles/bugle.css` (the `.daily-bugle` selectors already exist — inspect the file for the masthead, card and tab class names and target those; the block below assumes `.daily-bugle`, `.bugle-masthead`, `.bugle-card`):
```css
/* — Bugle presentations per universe (BugleSkin data-skin) — */
.bugle-skin[data-skin="616"] .daily-bugle { background: #f4e8c8 radial-gradient(circle, rgba(27,27,27,.25) .8px, transparent 1px) 0 0/5px 5px; color: #1b1b1b; border-right: 3px solid #1b1b1b; }
.bugle-skin[data-skin="616"] .daily-bugle .bugle-masthead { font-family: 'Bangers', cursive; color: #1b1b1b; border-bottom: 3px double #1b1b1b; }
.bugle-skin[data-skin="616"] .daily-bugle .bugle-card { background: #fffdf5; color: #1b1b1b; border: 1px solid #1b1b1b; box-shadow: 3px 3px 0 #1b1b1b; }
.bugle-skin[data-skin="mcu"] .daily-bugle { background: #06090f; color: #e6f1ff; border-right: 1px solid #7fb7ff; }
.bugle-skin[data-skin="mcu"] .daily-bugle .bugle-masthead { font-family: 'Rajdhani', sans-serif; letter-spacing: .3em; color: #7fb7ff; border-bottom: 1px solid #7fb7ff; }
.bugle-skin[data-skin="mcu"] .daily-bugle .bugle-card { background: rgba(127,183,255,.06); border: 1px solid rgba(127,183,255,.35); box-shadow: none; }
.bugle-skin[data-skin="toon"] .daily-bugle { background: #ffe14d; color: #101010; border-right: 5px solid #101010; }
.bugle-skin[data-skin="toon"] .daily-bugle .bugle-masthead { font-family: 'Luckiest Guy', cursive; color: #ff3b3b; -webkit-text-stroke: 1px #101010; border-bottom: 4px solid #101010; }
.bugle-skin[data-skin="toon"] .daily-bugle .bugle-card { background: #fff; border: 3px solid #101010; box-shadow: 4px 4px 0 #101010; }
/* verse = the existing look; no override */
.bugle-skin .daily-bugle, .bugle-skin .daily-bugle .bugle-masthead, .bugle-skin .daily-bugle .bugle-card { transition: background 400ms ease, color 400ms ease, border-color 400ms ease; }
```
Append to `src/styles/karen.css`: `.karen-hud.is-entering { animation: karen-in 300ms ease both } @keyframes karen-in { from { opacity: 0 } to { opacity: 1 } }`.

Append to `src/styles/comic.css`:
```css
/* — Page index — */
.page-index { position: fixed; left: calc(var(--bugle-w) + 16px); bottom: 16px; z-index: 40; font-family: var(--u-font-body); color: var(--u-ink); transition: left 300ms ease; }
.page-index-label { padding: 6px 10px; background: var(--u-caption-bg); border: 2px solid var(--u-ink); box-shadow: 3px 3px 0 var(--u-ink); font: 700 12px/1 inherit; letter-spacing: .12em; cursor: pointer; color: var(--u-ink); }
.page-index-fan { position: absolute; left: 0; bottom: 100%; margin: 0 0 8px; padding: 0; list-style: none; display: flex; gap: 8px; opacity: 0; transform: translateY(8px); pointer-events: none; transition: opacity 200ms ease, transform 200ms var(--u-ease); }
.page-index.is-open .page-index-fan { opacity: 1; transform: none; pointer-events: auto; }
.page-index-fan li { background: var(--u-bg); border: var(--u-panel-border); box-shadow: var(--u-panel-shadow); }
.page-index-fan button { display: grid; gap: 4px; padding: 6px; background: transparent; border: 0; cursor: pointer; color: var(--u-ink); font: 700 10px/1 var(--u-font-body); letter-spacing: .1em; }
.page-index-fan img { width: 96px; height: 60px; object-fit: cover; display: block; }
.page-index-fan [aria-current="true"] { outline: 3px solid var(--u-accent); }
@media (max-width: 767px) { .page-index { left: 12px; bottom: 12px; } .page-index-name { display: none; } .page-index-fan { display: none; } }
```

- [ ] **Step 5: Wire Home.tsx**

Replace the `DailyBugle` lazy import with `BugleSkin` (`import('../components/BugleSkin').then((m) => ({ default: m.BugleSkin }))`), import `PageIndex` statically (small), add `import { useUniverseStore } from '../store/universeStore'`, and gate KAREN:
```tsx
const active = useUniverseStore((s) => s.activeUniverse)
// …
<Suspense fallback={null}>
  <BugleSkin />
  {active === 'mcu' && <div className="karen-hud-mount is-entering"><KarenHUD /></div>}
  <SymbioteToggle />
  <BugleOverlay />
  <SuitHUD />
</Suspense>
<PageIndex />
```
(`KarenHUD` positions itself with `position: fixed`; the wrapper is only a fade hook — give it `display: contents` in `karen.css` and put the animation on `.karen-hud-mount.is-entering .karen-hud`.)

- [ ] **Step 6: Cursor tokens**

In `src/engine/webCursor.ts` change the colour reads to `var(--u-accent, var(--universe-primary, #ff2d2d))` in the three places that read `--universe-primary` (lines ~118–121, 134–137, 144). Keep the `[data-universe="toon"]` blend-mode special-case (light background); rename nothing else.

- [ ] **Step 7: Run tests, lint, build; manual**

`npx vitest run` green; `npx eslint src/comic src/components/BugleSkin.tsx src/pages src/engine/webCursor.ts`; `npm run build`. Manual: scroll through — Bugle reskins at each gutter (paper → HUD ticker → yellow toon → glitch), KAREN appears only in MCU with a fade, page index reads `p.N/4 · LABEL` and updates, fan-out shows four thumbs (paper fallback until stills land), clicking scrolls, `←/→` flip, cursor colour follows the skin.

- [ ] **Step 8: Commit**

```bash
git add src/comic src/components/BugleSkin.tsx src/components/__tests__ src/pages src/styles src/engine/webCursor.ts
git commit -m "feat(comic): per-universe Bugle presentations, MCU-only KAREN, page-corner index, cursor tokens"
```

---

### Task 7: Motion pass — seams, cover lift, parallax, enters, flourishes, reduced motion

**Files:**
- Create: `src/comic/motion.ts`, `src/comic/flourish.ts`, `src/comic/useComicMotion.ts`
- Modify: `src/pages/Home.tsx` (call `useComicMotion()`), `src/styles/comic.css` (initial states for `[data-motion]`)
- Test: `src/comic/__tests__/motion.test.ts`

**Interfaces:**
- Consumes: `prefersReducedMotion` (existing), `data-motion` attributes from T4/T5, `gsap` + `gsap/ScrollTrigger` (dynamic import).
- Produces: pure `gutterProgress(seamTop: number, viewportH: number): number` (0 when the seam is at the viewport bottom, 1 when it has left the top, clamped), `captionOffset(b): number` (−120 → 0 over [0.2, 0.5], 0 → −120 over [0.85, 1], in %), `panelSettle(b): { y: number; rot: number }` (`(1-b)*18`, `(1-b)*-1.5`); `bindAll(root: HTMLElement, gsap, ScrollTrigger): () => void` — installs every ScrollTrigger (adds class `has-motion` to `root`) and returns a teardown; `bindFlourishes(root, gsap): () => void`; `useComicMotion()` — effect that dynamic-imports GSAP, calls `bindAll(document.querySelector('.comic-page'))`, no-ops under reduced motion, tears down on unmount.

- [ ] **Step 1: Write the failing test**

`src/comic/__tests__/motion.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { gutterProgress, captionOffset, panelSettle } from '../motion'

describe('motion math', () => {
  it('gutterProgress maps seam position to 0..1', () => {
    expect(gutterProgress(800, 800)).toBe(0)     // seam at viewport bottom
    expect(gutterProgress(400, 800)).toBe(0.5)
    expect(gutterProgress(0, 800)).toBe(1)       // seam at the top
    expect(gutterProgress(-200, 800)).toBe(1)
    expect(gutterProgress(1200, 800)).toBe(0)
  })
  it('captionOffset slides in over [0.2,0.5] and out over [0.85,1]', () => {
    expect(captionOffset(0)).toBe(-120)
    expect(captionOffset(0.35)).toBeCloseTo(-60)
    expect(captionOffset(0.6)).toBe(0)
    expect(captionOffset(0.925)).toBeCloseTo(-60)
    expect(captionOffset(1)).toBe(-120)
  })
  it('panelSettle eases the next panel into place', () => {
    expect(panelSettle(0)).toEqual({ y: 18, rot: -1.5 })
    expect(panelSettle(1)).toEqual({ y: 0, rot: -0 })
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/comic/__tests__/motion.test.ts` → module not found.

- [ ] **Step 3: Implement motion.ts**

```ts
import { prefersReducedMotion } from '../engine/motion'

// Pure math (tested) + the ScrollTrigger bindings that use it. GSAP is
// passed in so this module never imports it statically.

export function gutterProgress(seamTop: number, viewportH: number): number {
  return Math.min(1, Math.max(0, 1 - seamTop / viewportH))
}
export function captionOffset(b: number): number {
  if (b < 0.2) return -120
  if (b < 0.5) return -120 * (1 - (b - 0.2) / 0.3)
  if (b < 0.85) return 0
  return -120 * ((b - 0.85) / 0.15)
}
export function panelSettle(b: number): { y: number; rot: number } {
  return { y: (1 - b) * 18, rot: (1 - b) * -1.5 }
}

type GSAP = typeof import('gsap').gsap
type ST = typeof import('gsap/ScrollTrigger').ScrollTrigger

export function bindAll(root: HTMLElement, gsap: GSAP, ScrollTrigger: ST): () => void {
  if (prefersReducedMotion()) return () => {}
  const triggers: InstanceType<ST>[] = []

  // Gutters: seam progress drives the following panel's settle + the caption.
  root.querySelectorAll<HTMLElement>('[data-motion="gutter"]').forEach((g) => {
    const panel = g.parentElement?.querySelector<HTMLElement>('.comic-panel')
    const caption = g.querySelector<HTMLElement>('[data-motion="caption"]')
    if (!panel) return
    triggers.push(ScrollTrigger.create({
      trigger: g, start: 'top bottom', end: 'top top', scrub: true,
      onUpdate: (self) => {
        const { y, rot } = panelSettle(self.progress)
        gsap.set(panel, { y, rotation: rot, transformOrigin: 'left top' })
        if (caption) gsap.set(caption, { xPercent: captionOffset(self.progress) })
      },
    }))
  })

  // Splash still parallax ±6%.
  root.querySelectorAll<HTMLElement>('[data-motion="parallax"] img').forEach((img) => {
    triggers.push(ScrollTrigger.create({
      trigger: img.closest('.comic-panel')!, start: 'top bottom', end: 'bottom top', scrub: true,
      onUpdate: (self) => gsap.set(img, { yPercent: -6 + self.progress * 12, scale: 1.12 }),
    }))
  })

  // Staggered enters (once) and grid frames in reading order (once).
  root.querySelectorAll<HTMLElement>('.comic-panel').forEach((panel) => {
    const enters = panel.querySelectorAll<HTMLElement>('[data-motion="enter"]')
    const frames = panel.querySelectorAll<HTMLElement>('[data-motion="frame"]')
    if (enters.length) gsap.set(enters, { autoAlpha: 0, y: 20 })
    if (frames.length) gsap.set(frames, { autoAlpha: 0, y: 24, rotation: -1.5, transformOrigin: 'left top' })
    triggers.push(ScrollTrigger.create({
      trigger: panel, start: 'top 70%', once: true,
      onEnter: () => {
        const ease = getComputedStyle(panel).getPropertyValue('--u-ease').trim() || 'power3.out'
        gsap.to(enters, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: toGsapEase(ease) })
        gsap.to(frames, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.5, stagger: 0.09, ease: toGsapEase(ease), delay: 0.15 })
        panel.dispatchEvent(new CustomEvent('comic:enter', { bubbles: false }))
      },
    }))
  })

  // Cover lift: pin briefly and rotate away once the visitor starts scrolling.
  const cover = root.querySelector<HTMLElement>('[data-motion="cover"]')
  if (cover) {
    gsap.set(cover, { transformPerspective: 1600, transformOrigin: 'left center' })
    triggers.push(ScrollTrigger.create({
      trigger: cover, start: 'top top', end: '+=10%', once: true,
      onEnter: () => gsap.to(cover, { rotationY: -100, duration: 0.6, ease: 'power2.in', onComplete: () => gsap.set(cover, { clearProps: 'transform' }) }),
    }))
  }

  return () => triggers.forEach((t) => t.kill())
}

// CSS eases → GSAP eases. steps(n) becomes a stepped ease; cubic-beziers map
// to the closest named GSAP ease so we don't ship CustomEase.
function toGsapEase(css: string): string {
  if (css.startsWith('steps')) return 'steps(5)'
  if (css.includes('1.56')) return 'back.out(1.6)'
  if (css.includes('0.45, 0')) return 'power2.inOut'
  return 'power4.out'
}
```

- [ ] **Step 4: Implement flourish.ts**

```ts
import glitchFrag from '../shaders/glitch.frag?raw'

// Per-skin flourishes, triggered by the 'comic:enter' event bindAll fires.
// 616: sfx word pop · mcu: HUD reticle scan over the still · toon: speed
// lines on the first frame · verse: chromatic glitch tick every 6–9 s.
type GSAP = typeof import('gsap').gsap

export function bindFlourishes(root: HTMLElement, gsap: GSAP): () => void {
  const cleanups: Array<() => void> = []
  root.querySelectorAll<HTMLElement>('.comic-panel').forEach((panel) => {
    const id = panel.getAttribute('data-universe')
    const onEnter = () => {
      if (id === '616' || id === 'toon') {
        const sfx = panel.querySelector('.comic-sfx')
        if (sfx) gsap.fromTo(sfx, { scale: 0, rotation: -30 }, { scale: 1, rotation: -8, duration: 0.5, ease: 'back.out(2)' })
      }
      if (id === 'mcu') {
        const still = panel.querySelector<HTMLElement>('.splash-still')
        if (still) {
          const line = document.createElement('div'); line.className = 'mcu-reticle'; still.appendChild(line)
          gsap.fromTo(line, { yPercent: -100 }, { yPercent: 100, duration: 1.2, ease: 'power1.inOut', onComplete: () => line.remove() })
        }
      }
      if (id === 'toon') {
        const first = panel.querySelector<HTMLElement>('[data-motion="frame"]')
        if (first) { first.classList.add('toon-burst'); setTimeout(() => first.classList.remove('toon-burst'), 500) }
      }
    }
    panel.addEventListener('comic:enter', onEnter)
    cleanups.push(() => panel.removeEventListener('comic:enter', onEnter))

    if (id === 'verse') {
      let timer = 0
      const tick = () => {
        panel.classList.add('verse-glitch')
        setTimeout(() => panel.classList.remove('verse-glitch'), 180)
        timer = window.setTimeout(tick, 6000 + Math.random() * 3000)
      }
      timer = window.setTimeout(tick, 4000)
      cleanups.push(() => clearTimeout(timer))
    }
  })
  void glitchFrag // reserved: a WebGL glitch quad is a follow-up; v1 uses the CSS tick above
  return () => cleanups.forEach((c) => c())
}
```

- [ ] **Step 5: Implement useComicMotion.ts and wire Home**

```ts
import { useEffect } from 'react'
import { prefersReducedMotion } from '../engine/motion'

// Loads GSAP + ScrollTrigger after mount and binds all comic motion.
export function useComicMotion(): void {
  useEffect(() => {
    if (prefersReducedMotion()) return
    const root = document.querySelector<HTMLElement>('.comic-page')
    if (!root) return
    let teardown: (() => void) | null = null
    let cancelled = false
    Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('./motion'), import('./flourish')]).then(
      ([{ gsap }, { ScrollTrigger }, motion, flourish]) => {
        if (cancelled) return
        gsap.registerPlugin(ScrollTrigger)
        const a = motion.bindAll(root, gsap, ScrollTrigger)
        const b = flourish.bindFlourishes(root, gsap)
        ScrollTrigger.refresh()
        teardown = () => { a(); b() }
      },
    )
    return () => { cancelled = true; teardown?.() }
  }, [])
}
```
In `Home.tsx` call `useComicMotion()` first inside the component.

Append to `comic.css` (initial states only apply when GSAP will animate — guard with a class `bindAll` adds): add `root.classList.add('has-motion')` at the top of `bindAll` (after the reduced-motion return) and:
```css
.has-motion [data-motion="enter"], .has-motion [data-motion="frame"] { visibility: hidden; }
.mcu-reticle { position: absolute; left: 0; right: 0; height: 2px; background: var(--u-accent); box-shadow: 0 0 12px var(--u-accent); pointer-events: none; }
.toon-burst::before { content: ''; position: absolute; inset: -14px; background: repeating-conic-gradient(from 0deg, transparent 0 8deg, rgba(16,16,16,.6) 8deg 10deg); mask: radial-gradient(circle, transparent 55%, #000 56%, #000 100%); -webkit-mask: radial-gradient(circle, transparent 55%, #000 56%, #000 100%); pointer-events: none; animation: burst 500ms ease-out both; }
@keyframes burst { from { transform: scale(.6); opacity: 1 } to { transform: scale(1.15); opacity: 0 } }
.verse-glitch { animation: verse-tick 180ms steps(3) both; }
@keyframes verse-tick { 0% { filter: none } 33% { filter: drop-shadow(-3px 0 #00e5ff) drop-shadow(3px 0 #ff2d6b); transform: translateX(-2px) } 66% { filter: drop-shadow(3px 0 #00e5ff) drop-shadow(-3px 0 #ff2d6b); transform: translateX(2px) } 100% { filter: none } }
@media (prefers-reduced-motion: reduce) { .comic-gutter-caption { transform: none !important; } .verse-glitch, .toon-burst::before { animation: none !important; } }
```
Also under reduced motion the caption must be visible without GSAP: `.comic-gutter-caption { transform: translateX(-120%) }` from Task 5 stays, and the `@media (prefers-reduced-motion)` rule above resets it.

- [ ] **Step 6: Run tests, lint, build; manual (required)**

`npx vitest run` green; `npx eslint src/comic src/pages`; `npm run build`. Manual in Chrome (`npm run dev`, `/`): scroll from the cover — it lifts away once; each gutter: the next panel settles from a tilt, the caption slides in then out; splash stills parallax; grid frames land in reading order; 616/toon sfx pops; mcu reticle scans the still; toon burst on the first frame; verse ticks every few seconds; no scroll hijack (wheel always moves the page). Reduced motion (DevTools → Rendering → emulate `prefers-reduced-motion: reduce`, reload): everything static, captions visible, no lift, no ticks. Console clean. Report each item.

- [ ] **Step 7: Commit**

```bash
git add src/comic src/pages/Home.tsx src/styles/comic.css
git commit -m "feat(comic): scroll-driven gutters, cover lift, parallax, staggered enters and per-skin flourishes"
```

---

### Task 8: Stills — candidates, approval, wiring, gates, tracker

**Files:**
- Create: `public/stills/_candidates/<universe>/*.jpg` + `public/stills/_candidates/sources.md` (temporary), then the approved `public/stills/{cover,616,mcu,toon,verse}/{hero,cover}.jpg` + `-thumb.jpg`; `scripts/make-thumbs.mjs`
- Modify: `src/data/stills.ts` (alt/credit text to match the approved images), `TRACKER.md` (one level above the git root — edit, don't commit)

**Interfaces:**
- Consumes: `STILLS` manifest (T2), `Still` primitive (T3), `NextIssue` credits (T5).
- Produces: real image files at the manifest paths; `npm run thumbs` (`node scripts/make-thumbs.mjs`) regenerates `-thumb.jpg` (400 px wide) from each `hero.jpg`/`cover.jpg` using `sharp` (add as a devDependency) — or, if `sharp` fails to install on this machine, ffmpeg: `ffmpeg -i in.jpg -vf scale=400:-1 out-thumb.jpg`.

This task has a **human approval gate** in the middle: the implementer stops after Step 3 and reports `NEEDS_INPUT` with the candidate list; the controller relays it to the owner; the task resumes at Step 4 with the owner's picks.

- [ ] **Step 1: Source candidates**

For each of `cover`, `616`, `mcu`, `toon`, `verse`, find 3 candidate images (official stills, posters or promo art — 616: classic Amazing Spider-Man comic art/covers; mcu: Tom Holland film stills/posters; toon: '94 animated series / Spectacular / Ultimate frames or key art; verse: Into/Across the Spider-Verse stills or posters; cover: a dynamic swinging shot that reads well cropped 16:9). Use WebSearch/WebFetch to locate them on official/press sources (Marvel.com, Sony Pictures press, studio promo, Wikipedia/Wikimedia file pages, IMDb media). Download each to `public/stills/_candidates/<universe>/<n>.jpg` and record in `public/stills/_candidates/sources.md`: file, source URL, title, rights owner, and the page it was found on. Prefer ≥ 1600 px wide. Do NOT commit `_candidates`.

- [ ] **Step 2: Contact sheet**

Write `public/stills/_candidates/index.html` — a plain page showing every candidate at 480 px wide with its file name, dimensions, and source, grouped by universe. Open it with `npx vite preview`-independent means (it's a static file; `npx serve public/stills/_candidates` or just the file URL) and screenshot each group to describe in the report.

- [ ] **Step 3: STOP — approval gate**

Report `NEEDS_INPUT` with the per-universe candidate list (file, source, why it fits). Do not proceed until the controller returns the owner's choices.

- [ ] **Step 4: Place approved stills + thumbs**

Copy the chosen file to its manifest path (`public/stills/cover/cover.jpg`, `public/stills/<u>/hero.jpg`), resize to ≤ 1600 px wide and ≤ 200 KB (`sharp` `.resize({ width: 1600 }).jpeg({ quality: 78 })`, or ffmpeg `-vf scale=1600:-1 -q:v 5`), write `scripts/make-thumbs.mjs` and run it for the `-thumb.jpg` files. Update each `STILLS` entry's `alt` and `credit` to the real title/owner from `sources.md`. Delete `public/stills/_candidates/`. Verify: `ls -la public/stills/*/` shows every manifest path present, no file > 200 KB (`find public/stills -name '*.jpg' -size +200k` empty).

- [ ] **Step 5: Gates**

`npx vitest run` green (the data test still passes — paths unchanged). `npm run build && npm run preview`, then `npx lighthouse http://localhost:4173/ --preset=desktop --only-categories=performance --quiet --chrome-flags="--headless=new" --output=json --output-path=./.superpowers/lighthouse-comic.json` — performance ≥ 90 (report the score, LCP and the largest image request). If < 90 because of images: lower JPEG quality to 70, confirm the cover still is the only eager image above the fold besides panel 1, and re-run. `ls dist/assets` — the `Mixtape-*`/visualizer chunk is still separate from `index-*`.

- [ ] **Step 6: Manual pass (required)**

Chrome, `/`: every universe shows its real still; the page index fan shows real thumbs; `NextIssue` lists the credits; break one path temporarily (rename a file) → paper fallback shows, no broken image, restore. Phone width (DevTools device toolbar 400 px): single column, stills 16:9, gutter captions as strips, page index collapsed, no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`). Report each item.

- [ ] **Step 7: Tracker + commit**

Append to `C:\Users\shoke\Documents\Claude\Projects\SPIDERMAN\TRACKER.md` a `## Phase 3 — Comic page rework` section: the four universes and their layouts, the skin contract, where stills live and how to regenerate thumbs, the still-credits/takedown posture, the `←/→` page flip, and the Lighthouse score. Update the footer date.
```bash
git add public/stills src/data/stills.ts scripts/make-thumbs.mjs package.json package-lock.json
git commit -m "feat(comic): official stills with credits and thumbnails; Lighthouse and mobile gates"
```
