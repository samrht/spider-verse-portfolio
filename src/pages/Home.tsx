import { lazy, Suspense, useEffect, useState } from 'react'
import { Cover } from '../comic/Cover'
import { SplashPanel } from '../comic/SplashPanel'
import { GridPanel } from '../comic/GridPanel'
import { Gutter } from '../comic/Gutter'
import { NextIssue } from '../comic/NextIssue'
import { PageIndex } from '../comic/PageIndex'
import { useComicMotion } from '../comic/useComicMotion'
import { UNIVERSES } from '../data/universes'
import { useUniverseStore } from '../store/universeStore'
import '../styles/comic.css'

// Fixed chrome stays lazy so GSAP/Howler stay off the critical path.
const BugleSkin = lazy(() => import('../components/BugleSkin').then((m) => ({ default: m.BugleSkin })))
const KarenHUD = lazy(() => import('../components/KarenHUD').then((m) => ({ default: m.KarenHUD })))
const SymbioteToggle = lazy(() => import('../components/SymbioteToggle').then((m) => ({ default: m.SymbioteToggle })))
const BugleOverlay = lazy(() => import('../components/BugleOverlay').then((m) => ({ default: m.BugleOverlay })))
const SuitHUD = lazy(() => import('../components/SuitHUD/SuitHUD').then((m) => ({ default: m.SuitHUD })))

// Home is a comic book: cover, four universe panels joined by gutters, back
// cover. Cursor + spider-sense + Lenis are dynamic-imported after mount.
export function Home() {
  useComicMotion()
  const active = useUniverseStore((s) => s.activeUniverse)
  // KAREN is MCU-only: fade in on entry, keep mounted 300 ms on exit to fade out.
  const [prevActive, setPrevActive] = useState(active)
  const [karenLeaving, setKarenLeaving] = useState(false)
  if (prevActive !== active) {
    setPrevActive(active)
    setKarenLeaving(prevActive === 'mcu')
  }
  useEffect(() => {
    if (!karenLeaving) return
    const t = window.setTimeout(() => setKarenLeaving(false), 300)
    return () => clearTimeout(t)
  }, [karenLeaving])

  useEffect(() => {
    let teardownCursor: (() => void) | null = null
    let teardownSense: (() => void) | null = null
    let cancelled = false
    Promise.all([import('../engine/webCursor'), import('../engine/spiderSense')]).then(([c, s]) => {
      if (cancelled) return
      teardownCursor = c.initCursor()
      teardownSense = s.initSpiderSense()
    })
    return () => { cancelled = true; teardownCursor?.(); teardownSense?.() }
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let teardown: (() => void) | null = null
    let cancelled = false
    import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return
      const lenis = new Lenis({ duration: 1.1, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true })
      let raf = 0
      const tick = (time: number) => { lenis.raf(time); raf = requestAnimationFrame(tick) }
      raf = requestAnimationFrame(tick)
      teardown = () => { cancelAnimationFrame(raf); lenis.destroy() }
    })
    return () => { cancelled = true; teardown?.() }
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <BugleSkin />
        {(active === 'mcu' || karenLeaving) && (
          // own boundary: KAREN's lazy chunk must not blank the rest of the chrome
          <Suspense fallback={null}>
            <div className={`karen-hud-mount ${active === 'mcu' ? 'is-entering' : 'is-leaving'}`}>
              <KarenHUD />
            </div>
          </Suspense>
        )}
        <SymbioteToggle />
        <BugleOverlay />
        <SuitHUD />
      </Suspense>
      <main className="comic-page">
        <Cover />
        {UNIVERSES.map((u, i) => (
          <div key={u.id} className="comic-spread">
            {i > 0 && <Gutter caption={u.caption} universe={u.id} />}
            {u.layout === 'splash' ? <SplashPanel universe={u.id} /> : <GridPanel universe={u.id} />}
          </div>
        ))}
        <NextIssue />
      </main>
      <PageIndex />
    </>
  )
}
