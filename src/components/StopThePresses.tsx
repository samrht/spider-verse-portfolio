import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { prefersReducedMotion } from '../engine/motion'

const TEXT = 'STOP THE PRESSES…'

interface StopThePressesProps {
  // "compact" packs tighter for the 20vw sidebar; "wide" is overlay/page.
  variant?: 'compact' | 'wide'
}

// Loading placeholder shown while CurrentsAPI is in-flight. Letters reveal one
// by one (typewriter), then fade and start again, until the parent unmounts
// this on fetch settle. Reduced-motion users get the static text — no flicker.
export function StopThePresses({ variant = 'wide' }: StopThePressesProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const node = containerRef.current
    if (!node) return
    const letters = node.querySelectorAll<HTMLSpanElement>('.bugle-press-letter')
    if (letters.length === 0) return

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 })
    tl.set(letters, { opacity: 0 })
    tl.to(letters, {
      opacity: 1,
      duration: 0.05,
      stagger: 0.07,
      ease: 'none',
    })
    tl.to(
      letters,
      {
        opacity: 0,
        duration: 0.2,
        stagger: 0.02,
        ease: 'power1.in',
      },
      '+=0.6',
    )

    return () => {
      tl.kill()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="bugle-press"
      data-variant={variant}
      role="status"
      aria-live="polite"
      aria-label={TEXT}
    >
      <span className="bugle-press-text" aria-hidden="true">
        {Array.from(TEXT).map((ch, i) => (
          <span key={i} className="bugle-press-letter">
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </span>
    </div>
  )
}
