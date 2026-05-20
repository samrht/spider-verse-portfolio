import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Earth1610 } from '../sections/Earth1610'
import { Earth65 } from '../sections/Earth65'
import { Earth138 } from '../sections/Earth138'
import { Earth928 } from '../sections/Earth928'
import { LockedPortals } from '../sections/LockedPortals'
import { useSuitStore } from '../store/suitStore'

// Post-loader UI is lazy so GSAP (DailyBugle) and Howler (audioStore chain
// behind SymbioteToggle) stay off the initial critical path.
const DailyBugle = lazy(() =>
  import('../components/DailyBugle').then((m) => ({ default: m.DailyBugle })),
)
const KarenHUD = lazy(() =>
  import('../components/KarenHUD').then((m) => ({ default: m.KarenHUD })),
)
const SymbioteToggle = lazy(() =>
  import('../components/SymbioteToggle').then((m) => ({ default: m.SymbioteToggle })),
)
// Bugle full-edition overlay. Mounted always (renders null while closed) so
// the GSAP unfold timeline isn't gated behind a second Suspense roundtrip
// when the user clicks "FULL EDITION →".
const BugleOverlay = lazy(() =>
  import('../components/BugleOverlay').then((m) => ({ default: m.BugleOverlay })),
)
// Spider-Suit HUD overlay — same mount strategy as BugleOverlay. Renders
// null while closed so its GSAP open tween isn't gated behind a second
// Suspense round-trip when the user clicks "INITIALIZE SUIT SYSTEMS".
const SuitHUD = lazy(() =>
  import('../components/SuitHUD/SuitHUD').then((m) => ({ default: m.SuitHUD })),
)

// Home orchestrates the mothership: 2.5s halftone loader, then the four
// universe sections + locked portal gateway, with the cursor/spider-sense
// engines and the fixed UI (Bugle, KAREN, symbiote listener) all riding
// inside a Lenis smooth-scroll wrapper.
//
// Engines that depend on Three.js, GSAP, Lenis, Howler are loaded via
// dynamic import() so their bytes don't sit on the critical path.
// Mothership-level "summon the Suit HUD" panel. Lives between Earth-928 and
// the locked portals so it reads as the natural payoff of the 2099 section.
// data-universe="earth-928" inherits the HUD's home palette without coupling
// to whatever universe the visitor is currently snap-scrolled to.
function SuitStandby() {
  const openSuit = useSuitStore((s) => s.openSuit)
  return (
    <section className="suit-standby" data-universe="earth-928" aria-label="Spider-Suit HUD launchpad">
      <div className="suit-standby-emblem" aria-hidden="true">
        <span className="suit-standby-ring" />
        <span className="suit-standby-ring" />
        <span className="suit-standby-ring" />
        <svg viewBox="0 0 24 24" width="56" height="56" fill="currentColor">
          <path d="M12 3 L13.6 8 L18 6.2 L15.6 10.4 L20 11.5 L15.6 13.6 L18 17.8 L13.6 16 L12 21 L10.4 16 L6 17.8 L8.4 13.6 L4 11.5 L8.4 10.4 L6 6.2 L10.4 8 Z" />
          <circle cx="12" cy="11.5" r="1.8" />
        </svg>
      </div>
      <span className="suit-standby-label">SUIT SYSTEMS STANDING BY</span>
      <button type="button" className="suit-standby-btn" onClick={() => void openSuit()} data-spider-sense>
        [ ACTIVATE ]
      </button>
    </section>
  )
}

export function Home() {
  // Dev hatch: ?nointro skips the loader when iterating in preview.
  const skipIntro =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('nointro')

  const [loaderDone, setLoaderDone] = useState(skipIntro)
  const loaderCanvasRef = useRef<HTMLCanvasElement>(null)

  // Halftone loader -------------------------------------------------------
  useEffect(() => {
    if (skipIntro) return
    const canvas = loaderCanvasRef.current
    if (!canvas) return

    let cancel: (() => void) | null = null
    let cancelled = false
    import('../engine/halftoneLoader').then(({ initHalftoneLoader }) => {
      if (cancelled) return
      const handle = initHalftoneLoader(canvas)
      cancel = handle.cancel
      handle.done.then(() => setLoaderDone(true))
    })
    return () => {
      cancelled = true
      cancel?.()
    }
  }, [skipIntro])

  // Cursor + spider-sense engines once the hero is visible ----------------
  useEffect(() => {
    if (!loaderDone) return
    let teardownCursor: (() => void) | null = null
    let teardownSense: (() => void) | null = null
    let cancelled = false

    Promise.all([
      import('../engine/webCursor'),
      import('../engine/spiderSense'),
    ]).then(([cursorMod, senseMod]) => {
      if (cancelled) return
      teardownCursor = cursorMod.initCursor()
      teardownSense = senseMod.initSpiderSense()
    })

    return () => {
      cancelled = true
      teardownCursor?.()
      teardownSense?.()
    }
  }, [loaderDone])

  // Lenis smooth scroll ---------------------------------------------------
  useEffect(() => {
    if (!loaderDone) return
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    let teardown: (() => void) | null = null
    let cancelled = false

    import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return
      const lenis = new Lenis({
        duration: 1.1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      })
      let raf = 0
      const tick = (time: number) => {
        lenis.raf(time)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      teardown = () => {
        cancelAnimationFrame(raf)
        lenis.destroy()
      }
    })

    return () => {
      cancelled = true
      teardown?.()
    }
  }, [loaderDone])

  return (
    <>
      {!loaderDone && (
        <canvas
          ref={loaderCanvasRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 10001,
            pointerEvents: 'none',
          }}
        />
      )}
      {loaderDone && (
        <Suspense fallback={null}>
          <DailyBugle />
          <KarenHUD />
          <SymbioteToggle />
          <BugleOverlay />
          <SuitHUD />
        </Suspense>
      )}
      <main>
        <Earth1610 />
        <Earth65 />
        <Earth138 />
        <Earth928 />
        <SuitStandby />
        <LockedPortals />
      </main>
    </>
  )
}
