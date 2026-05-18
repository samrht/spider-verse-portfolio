import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchBugleNews, BugleApiError } from '../api/newsApi'
import { useBugleStore } from '../store/bugleStore'
import { BugleCategoryTabs } from '../components/BugleCategoryTabs'
import { BugleArticleCard } from '../components/BugleArticleCard'
import { StopThePresses } from '../components/StopThePresses'
import { bugleHeadlines } from '../data/bugleHeadlines'
import { getRandomReporter } from '../data/reporters'
import { getRandomSpiderManStory } from '../data/spidermanStories'
import {
  BUGLE_CATEGORIES,
  BUGLE_CATEGORY_LABELS,
  isBugleCategory,
} from '../types/bugle'
import type { BugleArticle, BugleCategory } from '../types/bugle'

// Section header colors borrow from other universe palettes. Setting
// data-universe on the <h2> itself shifts only that element's
// --universe-primary / --universe-accent for the cascade — the surrounding
// page stays in Earth-1610 (dark red/purple). No hardcoded hex.
const SECTION_SCOPE: Record<
  BugleCategory,
  { universe: string; token: 'primary' | 'accent' }
> = {
  technology:    { universe: 'earth-928',  token: 'primary' }, // cyan
  sports:        { universe: 'earth-138',  token: 'primary' }, // yellow
  politics:      { universe: 'earth-1610', token: 'primary' }, // red
  science:       { universe: 'earth-65',   token: 'primary' }, // blue
  entertainment: { universe: 'earth-65',   token: 'accent'  }, // pink
}

// Real broadsheets number issues by day-of-year. "Vol. 312" is a static
// in-universe gag — Bugle founded 1962, ~5 vols/yr puts us around 312 today.
function buildMasthead(now: Date): { vol: string; date: string } {
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000)
  const date = now.toLocaleDateString(undefined, {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  })
  return { vol: `Vol. 312, No. ${dayOfYear}`, date }
}

function headlinesAsArticles(category: BugleCategory): BugleArticle[] {
  return bugleHeadlines.map((h) => ({
    id: h.id,
    headline: h.headline,
    lede: h.subhead ?? '',
    category,
    source: 'Daily Bugle',
    url: '/bugle',
    imageUrl: null,
    publishedAt: new Date().toISOString(),
    reporter: getRandomReporter(),
    isSpiderManStory: true,
  }))
}

type ByCategory = Record<BugleCategory, BugleArticle[]>

const EMPTY_BY_CATEGORY: ByCategory = {
  technology: [],
  sports: [],
  politics: [],
  science: [],
  entertainment: [],
}

// Standalone broadsheet page. Reuses the same BugleArticleCard / tabs /
// fetch pipeline as the sidebar and overlay, but lays them out as a full
// newspaper: huge masthead → sticky tab strip → pinned Spider-Man hero →
// five category sections, each with a color-coded header.
export function Bugle() {
  const [searchParams] = useSearchParams()
  const selectedCategory = useBugleStore((s) => s.selectedCategory)
  const setCategory = useBugleStore((s) => s.setCategory)

  // Pick once per mount (kept stable so navigation back & forth doesn't
  // shuffle the hero story or shift the date line).
  const [spiderStory] = useState(() => getRandomSpiderManStory())
  const [masthead] = useState(() => buildMasthead(new Date()))

  // Hydrate selected category from ?category=... query param.
  useEffect(() => {
    const raw = searchParams.get('category')
    if (raw && isBugleCategory(raw)) {
      setCategory(raw)
    }
  }, [searchParams, setCategory])

  // Fetch all 5 categories in parallel on mount so every section has
  // something to render without waiting for the user to click each tab.
  const [byCategory, setByCategory] = useState<ByCategory>(EMPTY_BY_CATEGORY)
  const [loadingCats, setLoadingCats] = useState<Set<BugleCategory>>(
    () => new Set(BUGLE_CATEGORIES),
  )

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    BUGLE_CATEGORIES.forEach((cat) => {
      fetchBugleNews(cat, controller.signal)
        .then((live) => {
          if (cancelled) return
          setByCategory((prev) => ({ ...prev, [cat]: live }))
          setLoadingCats((prev) => {
            const next = new Set(prev)
            next.delete(cat)
            return next
          })
        })
        .catch((err: unknown) => {
          if (cancelled) return
          if ((err as Error).name === 'AbortError') return
          if (err instanceof BugleApiError) {
            console.warn(`[Bugle] ${cat} unavailable:`, err.code)
          }
          setByCategory((prev) => ({
            ...prev,
            [cat]: headlinesAsArticles(cat),
          }))
          setLoadingCats((prev) => {
            const next = new Set(prev)
            next.delete(cat)
            return next
          })
        })
    })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  // Scroll-spy needs a brief mute window every time the category changes via
  // a tab click — the smooth-scroll animation passes intermediate sections
  // through the IO trigger band, which would otherwise feed back into
  // setCategory and prevent the scroll from reaching its target. We also
  // mute for 2s on initial mount so the URL-hydrated category (if any) isn't
  // immediately overwritten by whatever's visible at scroll=0.
  const scrollSpyMuteUntilRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() + 2000 : 0,
  )
  const selectedCategoryRef = useRef(selectedCategory)
  useEffect(() => {
    selectedCategoryRef.current = selectedCategory
  }, [selectedCategory])

  // Smooth-scroll to the active section when the category changes. Two
  // skip paths so this only fires on user-driven tab clicks, not on
  // scroll-spy updates:
  //   1. window.scrollY < 10 — initial load / deep link, keep the user on
  //      the masthead instead of snapping past it.
  //   2. The target section is already in the active band — the scroll-spy
  //      just set this category because the user scrolled here. Snapping
  //      to the section top would feel jerky / steal scroll control.
  useEffect(() => {
    const target = document.getElementById(`bugle-section-${selectedCategory}`)
    if (!target) return
    if (typeof window !== 'undefined' && window.scrollY < 10) return

    const rect = target.getBoundingClientRect()
    const triggerY = window.innerHeight * 0.25
    const inActiveBand = rect.top <= triggerY && rect.top + rect.height > triggerY
    if (inActiveBand) return

    scrollSpyMuteUntilRef.current = performance.now() + 900
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedCategory])

  // Scroll-spy: as the user scrolls naturally, light up the tab for the
  // section whose top has most-recently passed the trigger line (25% from
  // viewport top). We use a manual scroll listener rather than
  // IntersectionObserver because each section is ~4000px tall — IO with a
  // narrow trigger band leaves all 5 sections with tiny intersection ratios
  // (~0.04), and "highest ratio wins" stops being a meaningful signal at
  // that scale. Manual scroll lets us pick the last section that has crossed
  // the trigger line in DOM order — which is exactly the section the user
  // is currently reading.
  useEffect(() => {
    let rafPending = false

    const tick = () => {
      rafPending = false
      if (performance.now() < scrollSpyMuteUntilRef.current) return
      const triggerY = window.innerHeight * 0.25
      let active: BugleCategory | null = null
      for (const cat of BUGLE_CATEGORIES) {
        const el = document.getElementById(`bugle-section-${cat}`)
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top <= triggerY) {
          active = cat
        } else {
          // Sections render in DOM order = visual top-to-bottom. Once a
          // section hasn't crossed the line, none below it have either.
          break
        }
      }
      if (active && active !== selectedCategoryRef.current) {
        setCategory(active)
      }
    }

    const onScroll = () => {
      if (rafPending) return
      rafPending = true
      requestAnimationFrame(tick)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    // Run once on mount so we settle on the right tab if the user lands
    // already scrolled (e.g., browser restored scroll position).
    onScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [setCategory])

  return (
    <main className="bugle-page bugle-surface" data-universe="earth-1610">
      <header className="bugle-page-masthead">
        <h1>THE DAILY BUGLE</h1>
        <p className="bugle-page-tagline">NEW YORK'S FINEST NEWS SOURCE</p>
        <p className="bugle-page-date">
          {masthead.vol}, {masthead.date}
        </p>
      </header>

      <div className="bugle-page-tabs">
        <Link to="/" className="bugle-back-link" aria-label="Return to the mothership portfolio">
          ← MOTHERSHIP
        </Link>
        <BugleCategoryTabs variant="wide" />
      </div>

      <article className="bugle-page-hero" aria-label="Spider-Man exclusive">
        <BugleArticleCard article={spiderStory} variant="full" />
      </article>

      {BUGLE_CATEGORIES.map((cat) => {
        const scope = SECTION_SCOPE[cat]
        const list = byCategory[cat]
        const isLoading = loadingCats.has(cat)
        return (
          <section
            key={cat}
            id={`bugle-section-${cat}`}
            className="bugle-page-section"
            data-cat={cat}
          >
            <h2
              className="bugle-section-header"
              data-universe={scope.universe}
              data-token={scope.token}
            >
              {BUGLE_CATEGORY_LABELS[cat]}
            </h2>
            <div className="bugle-page-grid">
              {isLoading ? (
                <StopThePresses variant="wide" />
              ) : list.length === 0 ? (
                <p className="bugle-overlay-empty">No dispatches today.</p>
              ) : (
                list.map((a) => (
                  <BugleArticleCard key={a.id} article={a} variant="full" />
                ))
              )}
            </div>
          </section>
        )
      })}

      <footer className="bugle-page-footer">
        <span>EST. 1962 · J. JONAH JAMESON, EDITOR-IN-CHIEF</span>
        <span>NEW YORK · NEW YORK</span>
      </footer>
    </main>
  )
}
