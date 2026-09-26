import { useEffect } from 'react'
import type { RefObject } from 'react'
import type { AudioSignal } from '../signal/types'
import { prefersReducedMotion } from '../../engine/motion'

// Writes the live beat (0–1) to a --beat CSS variable once per frame, so deck
// faces and the verse flash can react in CSS without re-rendering React.
export function useBeatVar(ref: RefObject<HTMLElement | null>, signal: AudioSignal): void {
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = ref.current
      if (el) el.style.setProperty('--beat', prefersReducedMotion() ? '0' : signal.beat.toFixed(3))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ref, signal])
}
