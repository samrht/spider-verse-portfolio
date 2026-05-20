import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { useSuitStore } from '../../store/suitStore'
import { SUIT_MODE_UNIVERSE } from '../../types/suit'
import { prefersReducedMotion } from '../../engine/motion'
import { BootSequence } from './BootSequence'
import { ChronPanel } from './panels/ChronPanel'
import { AtmosPanel } from './panels/AtmosPanel'
import { WebFluidPanel } from './panels/WebFluidPanel'
import { MissionPanel } from './panels/MissionPanel'
import { SuitModeBar } from './SuitModeBar'
import '../../styles/suit.css'

// Spider-Suit HUD overlay. Summoned from any mothership entry point via
// useSuitStore.openSuit(). Mirrors the BugleOverlay pattern: body scroll lock,
// ESC + backdrop dismiss, GSAP open tween, lazy-mounted into Home.tsx's
// Suspense block so its bytes stay off the boot path.
export function SuitHUD() {
  const isOpen = useSuitStore((s) => s.isOverlayOpen)
  const isBooting = useSuitStore((s) => s.isBooting)
  const closeSuit = useSuitStore((s) => s.closeSuit)
  const activeSuitMode = useSuitStore((s) => s.activeSuitMode)
  const completeBoot = useSuitStore((s) => s.completeBoot)

  const backdropRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Open tween — fade backdrop, scale-in surface from 96% to 100%.
  useEffect(() => {
    if (!isOpen) return
    const surface = surfaceRef.current
    const backdrop = backdropRef.current
    if (!surface || !backdrop) return

    closeBtnRef.current?.focus()

    if (prefersReducedMotion()) {
      gsap.set(backdrop, { opacity: 1 })
      gsap.set(surface, { opacity: 1, scale: 1 })
      return
    }
    const tl = gsap.timeline()
    tl.fromTo(
      backdrop,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: 'power2.out' },
    )
    tl.fromTo(
      surface,
      { opacity: 0, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' },
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
      if (e.key === 'Escape') closeSuit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, closeSuit])

  // Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  if (!isOpen) return null

  const dataUniverse = SUIT_MODE_UNIVERSE[activeSuitMode]

  return (
    <div
      ref={backdropRef}
      className="suit-hud-backdrop"
      data-lenis-prevent
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSuit()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Spider-Suit HUD"
    >
      <section
        ref={surfaceRef}
        className={`suit-hud suit-${activeSuitMode}`}
        data-universe={dataUniverse}
      >
        <div className="suit-hud-scanline" aria-hidden="true" />

        {isBooting ? (
          <BootSequence mode={activeSuitMode} onComplete={completeBoot} />
        ) : (
          <>
            <header className="suit-hud-header">
              <span className="suit-hud-title font-display">SPIDER-SUIT HUD</span>
              <button
                ref={closeBtnRef}
                type="button"
                className="suit-hud-close"
                onClick={closeSuit}
                aria-label="Close suit HUD"
              >
                ✕ POWER DOWN
              </button>
            </header>

            <div className="suit-hud-grid">
              <ChronPanel />
              <AtmosPanel />
              <WebFluidPanel />
              <MissionPanel />
            </div>

            <footer className="suit-hud-footer">
              <SuitModeBar rootRef={surfaceRef} />
              <Link
                to="/suit"
                className="suit-hud-expand"
                onClick={closeSuit}
              >
                EXPAND SYSTEMS →
              </Link>
            </footer>
          </>
        )}
      </section>
    </div>
  )
}
