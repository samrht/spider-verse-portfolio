import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useUniverseStore } from '../../store/universeStore'
import { prefersReducedMotion } from '../../engine/motion'
import { useDeckControls } from './useDeckControls'
import { Tracklist } from './Tracklist'
import { FACES, FACE_IDS } from './faces'
import '../../styles/faces/base.css'

// Deck shell (spec §3.2): picks the face for the active universe, cross-fades
// on a switch, slides out when hidden (inert while hidden) and keeps the
// tracklist. All behaviour lives in useDeckControls; faces only draw it.

const FADE_MS = 200

export function Deck() {
  const universe = useUniverseStore((s) => s.activeUniverse)
  const c = useDeckControls()
  const rootRef = useRef<HTMLDivElement>(null)
  const reduced = prefersReducedMotion()

  // Render-phase adjust (no setState in effects): mark the current face as
  // leaving; the timer below mounts whatever the universe is when it fires,
  // so a second switch mid-fade simply lands on the latest universe.
  const [shown, setShown] = useState(universe)
  const [leaving, setLeaving] = useState(false)
  if (universe !== shown && !leaving) {
    if (reduced) setShown(universe)
    else setLeaving(true)
  }
  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(() => { setShown(universe); setLeaving(false) }, FADE_MS)
    return () => window.clearTimeout(t)
  }, [leaving, universe])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (reduced) { gsap.set(el, { y: c.hidden ? '100%' : '0%' }); return }
    gsap.to(el, { y: c.hidden ? '100%' : '0%', duration: 0.35, ease: 'power3.inOut', overwrite: true })
  }, [c.hidden, reduced])

  // Publish the deck height so the page index can sit above it (spec §6).
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => {
      el.parentElement?.style.setProperty('--deck-h', `${Math.round(e.contentRect.height)}px`)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const FaceC = FACES[shown]
  return (
    <>
      {c.hidden && <button type="button" className="viz-deck-reveal" aria-label="Show player" onClick={c.show} />}
      <div
        ref={rootRef}
        className={`viz-deck ${c.isPlaying ? 'is-playing' : ''}`}
        data-face={FACE_IDS[shown]}
        aria-label="Mixtape deck"
        aria-hidden={c.hidden || undefined}
        inert={c.hidden || undefined}
      >
        <Tracklist open={c.listOpen} />
        <div key={shown} className={`viz-face ${leaving ? 'is-leaving' : 'is-entering'}`}>
          <FaceC c={c} />
        </div>
      </div>
    </>
  )
}
