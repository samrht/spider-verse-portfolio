import { lazy, Suspense, useEffect } from 'react'
import { Cover } from '../comic/Cover'
import { SplashPanel } from '../comic/SplashPanel'
import { GridPanel } from '../comic/GridPanel'
import { Gutter } from '../comic/Gutter'
import { NextIssue } from '../comic/NextIssue'
import { PageIndex } from '../comic/PageIndex'
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
  const active = useUniverseStore((s) => s.activeUniverse)

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
        {active === 'mcu' && (
          <div className="karen-hud-mount is-entering">
            <KarenHUD />
          </div>
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
