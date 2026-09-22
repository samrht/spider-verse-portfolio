import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useUniverseStore, type Universe } from '../store/universeStore'

// The frame around one universe. Owns the data-universe scope for its
// subtree and reports itself as the active universe when it dominates the
// viewport: ≥ 55% of the panel is visible, or it fills ≥ 55% of the viewport
// (the second case is what lets panels taller than ~1.8 viewports activate).
const THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20)

function dominates(e: Pick<IntersectionObserverEntry, 'intersectionRatio'> & Partial<IntersectionObserverEntry>): boolean {
  if (e.intersectionRatio >= 0.55) return true
  const vh = e.rootBounds?.height ?? window.innerHeight
  return !!e.intersectionRect && vh > 0 && e.intersectionRect.height >= 0.55 * vh
}

export function ComicPanel({ universe, children, className = '' }: { universe: Universe; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) if (dominates(e)) useUniverseStore.getState().setUniverse(universe) },
      { threshold: THRESHOLDS },
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
