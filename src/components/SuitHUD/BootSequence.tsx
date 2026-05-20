import { useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { prefersReducedMotion } from '../../engine/motion'
import {
  SUIT_MODE_BOOT_LINE,
  type SuitMode,
} from '../../types/suit'

interface BootSequenceProps {
  mode: SuitMode
  onComplete: () => void
}

// Lines 1-7 are constant across suit modes; line 8 swaps per active mode
// (the final personality line). The brief calls for typewriter reveal, ~2.5s
// total. Each line types in around 0.28-0.35s with a small gap, ending in
// a call() to onComplete which un-mounts this and reveals the HUD panels.
const STATIC_LINES = [
  'SPIDER-MAN SUIT OS v4.2.1',
  'INITIALIZING...',
  '▸ WEB SYSTEMS............ONLINE',
  '▸ THREAT ANALYSIS.........ONLINE',
  '▸ ATMOSPHERIC SENSORS.....ONLINE',
  '▸ CHRONOMETER.............ONLINE',
  'SUIT INTEGRITY: 100%',
] as const

// 'WELCOME BACK, SPIDER-MAN.' is the brief's default closer; mode-specific
// closers come from SUIT_MODE_BOOT_LINE. We render BOTH so reduced-motion
// users still see the welcome line. The final closer prefixes welcome with
// a blank tick.
export function BootSequence({ mode, onComplete }: BootSequenceProps) {
  const rootRef = useRef<HTMLPreElement>(null)
  const completedRef = useRef(false)

  const lines = useMemo(
    () => [...STATIC_LINES, '', `WELCOME BACK, SPIDER-MAN.`, SUIT_MODE_BOOT_LINE[mode]],
    [mode],
  )

  useEffect(() => {
    const node = rootRef.current
    if (!node) return

    const safeComplete = () => {
      if (completedRef.current) return
      completedRef.current = true
      onComplete()
    }

    if (prefersReducedMotion()) {
      // Instant-render everything, then yield to the next frame so the parent
      // sees the fully-rendered boot text before the HUD panels swap in.
      node
        .querySelectorAll<HTMLSpanElement>('.suit-boot-char')
        .forEach((el) => (el.style.opacity = '1'))
      const t = window.setTimeout(safeComplete, 120)
      return () => window.clearTimeout(t)
    }

    const lineEls = node.querySelectorAll<HTMLDivElement>('.suit-boot-line')
    const tl = gsap.timeline({
      onComplete: safeComplete,
    })
    lineEls.forEach((line, i) => {
      const chars = line.querySelectorAll<HTMLSpanElement>('.suit-boot-char')
      if (chars.length === 0) {
        tl.to({}, { duration: 0.08 })
        return
      }
      tl.set(chars, { opacity: 0 }, i === 0 ? 0 : '+=0.06')
      tl.to(chars, {
        opacity: 1,
        duration: 0.02,
        stagger: 0.022,
        ease: 'none',
      })
    })

    return () => {
      tl.kill()
    }
  }, [onComplete, lines])

  return (
    <pre
      ref={rootRef}
      className="suit-boot font-mono"
      role="status"
      aria-live="polite"
      aria-label="Suit boot sequence"
    >
      {lines.map((line, lineIdx) => (
        <div key={lineIdx} className="suit-boot-line">
          {line.length === 0 ? (
            <span className="suit-boot-char">&nbsp;</span>
          ) : (
            Array.from(line).map((ch, i) => (
              <span key={i} className="suit-boot-char">
                {ch === ' ' ? ' ' : ch}
              </span>
            ))
          )}
        </div>
      ))}
    </pre>
  )
}
