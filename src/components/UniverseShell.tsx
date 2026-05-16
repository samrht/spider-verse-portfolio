import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { type Universe } from '../store/universeStore'
import { requestUniverseChange } from '../engine/universeTransition'

interface Props {
  universe: Universe
  id?: string
  children: ReactNode
}

// Section wrapper that injects the universe's CSS-token context and reports
// itself to the universe store when it dominates the viewport. Layout is
// owned by the section content, not by this shell. Universe changes route
// through the glitch transition (Step 10).
export function UniverseShell({ universe, id, children }: Props) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.55) {
            requestUniverseChange(universe)
          }
        }
      },
      { threshold: [0, 0.25, 0.55, 0.75, 1] },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [universe])

  return (
    <section
      ref={ref}
      id={id ?? universe}
      data-universe={universe}
      data-spider-sense
      className="relative w-full min-h-screen overflow-hidden"
      style={{
        background: 'var(--universe-bg)',
        color: 'var(--universe-text)',
      }}
    >
      {children}
    </section>
  )
}
