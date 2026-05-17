import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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

  // Smooth-scroll to the active section when a tab is clicked.
  useEffect(() => {
    const target = document.getElementById(`bugle-section-${selectedCategory}`)
    if (!target) return
    // Skip the initial paint scroll so deep links don't bypass the masthead.
    if (typeof window !== 'undefined' && window.scrollY < 10) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedCategory])

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
