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
