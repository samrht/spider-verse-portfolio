import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import gsap from 'gsap'
import { fetchBugleNews, BugleApiError } from '../api/newsApi'
import { useBugleStore } from '../store/bugleStore'
import { bugleHeadlines } from '../data/bugleHeadlines'
import { getRandomReporter } from '../data/reporters'
import { prefersReducedMotion } from '../engine/motion'
import { BugleCategoryTabs } from './BugleCategoryTabs'
import { BugleArticleCard } from './BugleArticleCard'
import { StopThePresses } from './StopThePresses'
import type { BugleArticle, BugleCategory } from '../types/bugle'

const SIDEBAR_LIMIT = 5

// When CurrentsAPI is unavailable (no key, network error, etc) we map the
// static Phase 1 bugleHeadlines into the BugleArticle shape so the sidebar
// can render the same card component either way. These all flag as
// isSpiderManStory because they're in-universe Bugle fiction.
function headlinesAsArticles(category: BugleCategory): BugleArticle[] {
  return bugleHeadlines.slice(0, SIDEBAR_LIMIT).map((h) => ({
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

// Fixed left-edge Bugle rail. Phase 2 changes from newsprint paper to a dark
// Earth-1610 broadsheet — data-universe="earth-1610" forces the universe
// tokens locally even when the user is currently viewing another universe.
// The masthead is the collapse affordance (not the whole aside) so the new
// interactive tabs / cards / FULL EDITION button don't accidentally toggle
// the rail when clicked.
export function DailyBugle() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [articles, setArticles] = useState<BugleArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const selectedCategory = useBugleStore((s) => s.selectedCategory)
  const openOverlay = useBugleStore((s) => s.openOverlay)

  // Fold-in on mount (newspaper unfurl). Skipped under reduced motion.
  useEffect(() => {
    if (prefersReducedMotion()) return
    const el = rootRef.current
    if (!el) return
    gsap.fromTo(
      el,
      { scaleY: 0, transformOrigin: 'top center' },
      { scaleY: 1, duration: 0.9, ease: 'power3.out', delay: 0.15 },
    )
  }, [])

  // Live news fetch per category. AbortController cancels in-flight requests
  // on rapid tab changes / unmount. Any error path falls back to the static
  // Phase 1 headlines so the rail always shows something.
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    setIsLoading(true)
    fetchBugleNews(selectedCategory, controller.signal)
      .then((live) => {
        if (cancelled) return
        setArticles(live.slice(0, SIDEBAR_LIMIT))
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if ((err as Error).name === 'AbortError') return
        if (err instanceof BugleApiError) {
          console.warn(
            '[DailyBugle] live news unavailable — falling back to static headlines:',
            err.code,
            err.message,
          )
        }
        setArticles(headlinesAsArticles(selectedCategory))
        setIsLoading(false)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [selectedCategory])

  const toggleCollapse = (e: ReactMouseEvent | ReactKeyboardEvent) => {
    e.stopPropagation()
    setCollapsed((c) => !c)
  }

  // Collapsed state — the whole rail is just a vertical "BUGLE" tab.
  if (collapsed) {
    return (
      <aside
        ref={rootRef}
        className="daily-bugle"
        data-universe="earth-1610"
        data-collapsed
        onClick={toggleCollapse}
        aria-label="The Daily Bugle (collapsed — click to expand)"
      >
        <div className="bugle-tab">
          <span>BUGLE</span>
        </div>
      </aside>
    )
  }

  return (
    <aside
      ref={rootRef}
      className="daily-bugle bugle-surface"
      data-universe="earth-1610"
      aria-label="The Daily Bugle"
    >
      <div className="bugle-inner">
        <header
          className="bugle-masthead"
          onClick={toggleCollapse}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') toggleCollapse(e)
          }}
          role="button"
          tabIndex={0}
          aria-label="Collapse the Bugle"
        >
          <div className="bugle-rule" />
          <h2>THE DAILY BUGLE</h2>
          <div className="bugle-rule" />
          <p className="bugle-strap">
            <span>NEW YORK</span>
            <span>·</span>
            <span>FINAL EDITION</span>
            <span>·</span>
            <span>10¢</span>
          </p>
        </header>

        <BugleCategoryTabs variant="sidebar" />

        <section className="bugle-feed" aria-live="polite" data-lenis-prevent>
          {isLoading ? (
            <StopThePresses variant="compact" />
          ) : articles.length === 0 ? (
            <p className="bugle-loading">No wire dispatches.</p>
          ) : (
            <ul className="bugle-feed-list">
              {articles.map((a) => (
                <li key={a.id}>
                  <BugleArticleCard article={a} variant="compact" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="bugle-footer">
          <button
            type="button"
            className="bugle-full-edition"
            onClick={(e) => {
              e.stopPropagation()
              openOverlay()
            }}
          >
            FULL EDITION →
          </button>
          <span className="bugle-footer-meta">EST. 1962 · J.J.J., ED.</span>
        </footer>
      </div>
    </aside>
  )
}
