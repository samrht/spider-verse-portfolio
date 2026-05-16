import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { bugleHeadlines } from '../data/bugleHeadlines'
import { prefersReducedMotion } from '../engine/motion'

const CYCLE_MS = 5200
const FADE_MS = 600

// Fixed 20vw newsprint sidebar that lives outside the universe token system —
// the Bugle is always yellow paper with red ink, no matter which universe is
// active. On mount it unfolds from the top like a freshly-printed page.
// Headlines auto-cycle; clicking the masthead collapses the sidebar to a tab.
export function DailyBugle() {
  const rootRef = useRef<HTMLDivElement>(null)
  const featuredRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [collapsed, setCollapsed] = useState(false)

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

  // Headline cycle. Reduced motion: opacity-only flip, no Y translate.
  useEffect(() => {
    if (collapsed) return
    const reduce = prefersReducedMotion()
    const id = window.setInterval(() => {
      const node = featuredRef.current
      if (!node || reduce) {
        setActiveIndex((i) => (i + 1) % bugleHeadlines.length)
        return
      }
      gsap.to(node, {
        opacity: 0,
        y: -8,
        duration: FADE_MS / 1000,
        ease: 'power2.in',
        onComplete: () => {
          setActiveIndex((i) => (i + 1) % bugleHeadlines.length)
          gsap.fromTo(
            node,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: FADE_MS / 1000, ease: 'power2.out' },
          )
        },
      })
    }, CYCLE_MS)
    return () => window.clearInterval(id)
  }, [collapsed])

  const active = bugleHeadlines[activeIndex]
  const upNext = [0, 1, 2, 3].map(
    (offset) => bugleHeadlines[(activeIndex + 1 + offset) % bugleHeadlines.length],
  )

  return (
    <aside
      ref={rootRef}
      className="daily-bugle"
      data-collapsed={collapsed || undefined}
      onClick={() => setCollapsed((c) => !c)}
      aria-label="The Daily Bugle"
    >
      {collapsed ? (
        <div className="bugle-tab">
          <span>BUGLE</span>
        </div>
      ) : (
        <div className="bugle-inner">
          <header className="bugle-masthead">
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

          <div ref={featuredRef} className="bugle-featured">
            <p className="bugle-date">{active.date}</p>
            <h3 className="bugle-headline">{active.headline}</h3>
            {active.subhead && <p className="bugle-subhead">{active.subhead}</p>}
          </div>

          <section className="bugle-more">
            <p className="bugle-section-label">More Front Page</p>
            <ul>
              {upNext.map((h) => (
                <li key={h.id}>{h.headline}</li>
              ))}
            </ul>
          </section>

          <footer className="bugle-footer">
            <span>EST. 1962</span>
            <span>J.J.J., ED.</span>
          </footer>
        </div>
      )}
    </aside>
  )
}
