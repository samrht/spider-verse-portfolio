import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { useBugleStore } from '../store/bugleStore'
import { fetchBugleNews, BugleApiError } from '../api/newsApi'
import { bugleHeadlines } from '../data/bugleHeadlines'
import { getRandomReporter } from '../data/reporters'
import { getRandomSpiderManStory } from '../data/spidermanStories'
import { prefersReducedMotion } from '../engine/motion'
import { BugleCategoryTabs } from './BugleCategoryTabs'
import { BugleArticleCard } from './BugleArticleCard'
import { StopThePresses } from './StopThePresses'
import type { BugleArticle, BugleCategory } from '../types/bugle'

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

// Full-screen overlay that unfolds from the sidebar's right edge like a
// newspaper being snapped open. ESC + the CLOSE EDITION button + clicking the
// backdrop all close it. The portfolio behind stays mounted (just dimmed) so
// the universe context isn't lost — this is overlay, not a route change.
export function BugleOverlay() {
  const isOpen = useBugleStore((s) => s.isOverlayOpen)
  const closeOverlay = useBugleStore((s) => s.closeOverlay)
  const selectedCategory = useBugleStore((s) => s.selectedCategory)

  const [articles, setArticles] = useState<BugleArticle[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // Random spider-man exclusive picked once per mount — pinned top-left.
  const [spiderStory] = useState(() => getRandomSpiderManStory())

  const backdropRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // GSAP unfold timeline. Origin = left edge so the surface scales out from
  // the sidebar's right edge. Reduced motion: instant fade with no transform.
  useEffect(() => {
    if (!isOpen) return
    const surface = surfaceRef.current
    const backdrop = backdropRef.current
    if (!surface || !backdrop) return

    // Move keyboard focus into the dialog.
    closeBtnRef.current?.focus()

    if (prefersReducedMotion()) {
      gsap.set(backdrop, { opacity: 1 })
      gsap.set(surface, { opacity: 1, scaleX: 1, rotateY: 0 })
      return
    }

    const tl = gsap.timeline()
    tl.fromTo(
      backdrop,
      { opacity: 0 },
      { opacity: 1, duration: 0.25, ease: 'power2.out' },
    )
    tl.fromTo(
      surface,
      {
        scaleX: 0,
        opacity: 0,
        rotateY: -15,
        transformOrigin: 'left center',
      },
      {
        scaleX: 1,
        opacity: 1,
        rotateY: 0,
        duration: 0.55,
        ease: 'power3.out',
      },
      '-=0.15',
    )
    return () => {
      tl.kill()
    }
  }, [isOpen])

  // ESC closes the overlay.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeOverlay()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, closeOverlay])

  // Lock body scroll while overlay is open.
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  // Re-fetch on category change while open. Same fallback path as the sidebar.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const controller = new AbortController()
    setIsLoading(true)
    fetchBugleNews(selectedCategory, controller.signal)
      .then((live) => {
        if (cancelled) return
        setArticles(live)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if ((err as Error).name === 'AbortError') return
        if (err instanceof BugleApiError) {
          console.warn('[BugleOverlay] live news unavailable:', err.code)
        }
        setArticles(headlinesAsArticles(selectedCategory))
        setIsLoading(false)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isOpen, selectedCategory])

  if (!isOpen) return null

  return (
    <div
      ref={backdropRef}
      className="bugle-overlay-backdrop"
      data-universe="earth-1610"
      data-lenis-prevent
      onClick={(e) => {
        if (e.target === e.currentTarget) closeOverlay()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="The Daily Bugle — Full Edition"
    >
      <div ref={surfaceRef} className="bugle-overlay bugle-surface">
        <header className="bugle-overlay-header">
          <h2 className="bugle-overlay-masthead">THE DAILY BUGLE</h2>
          <div className="bugle-overlay-actions">
            <Link
              to="/bugle"
              className="bugle-open-page"
              onClick={closeOverlay}
              aria-label="Open the full Daily Bugle page"
            >
              OPEN PAGE ↗
            </Link>
            <button
              ref={closeBtnRef}
              type="button"
              className="bugle-close"
              onClick={closeOverlay}
              aria-label="Close the full edition"
            >
              ✕ CLOSE EDITION
            </button>
          </div>
        </header>
        <div className="bugle-overlay-tabs">
          <BugleCategoryTabs variant="wide" />
        </div>
        <div className="bugle-overlay-body">
          <div className="bugle-overlay-spider">
            <BugleArticleCard article={spiderStory} variant="full" />
          </div>
          {isLoading && <StopThePresses variant="wide" />}
          {!isLoading && articles.length === 0 && (
            <p className="bugle-overlay-empty">No wire dispatches today.</p>
          )}
          {!isLoading &&
            articles.map((a) => (
              <BugleArticleCard key={a.id} article={a} variant="full" />
            ))}
        </div>
      </div>
    </div>
  )
}
