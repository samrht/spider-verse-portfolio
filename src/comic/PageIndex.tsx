import { useEffect, useState } from 'react'
import { UNIVERSE_IDS, useUniverseStore } from '../store/universeStore'
import { universeById } from '../data/universes'
import { stillById, PAPER_FALLBACK } from '../data/stills'
import { labelFor, nextUniverse, pageOf, scrollToUniverse } from './pageNav'

// Fan-out thumbnail. Falls back to the paper texture on load error so a
// missing/placeholder still file never shows a broken image (same guard
// pattern as comic/primitives.tsx's <Still>).
function ThumbImg({ src }: { src: string }) {
  const [current, setCurrent] = useState(src)
  return (
    <img
      src={current}
      alt=""
      loading="lazy"
      onError={() => { if (current !== PAPER_FALLBACK) setCurrent(PAPER_FALLBACK) }}
    />
  )
}

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
                {still && <ThumbImg src={still.thumb} />}
                <span>p.{pageOf(id)} {labelFor(id)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
