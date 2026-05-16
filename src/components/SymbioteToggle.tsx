import { useEffect } from 'react'
import { useUniverseStore } from '../store/universeStore'
import { useAudioStore } from '../store/audioStore'
import { prefersReducedMotion } from '../engine/motion'

const SEQUENCE = ['s', 'y', 'm'] as const
const WINDOW_MS = 1500
const INK_DURATION_MS = 800

// Invisible easter-egg listener. Press S → Y → M within 1.5s and an ink-crawl
// reveal sweeps from the cursor position while `data-symbiote="true"` is
// toggled on <html>. Trigger the same sequence again to peel the symbiote off.
export function SymbioteToggle() {
  const toggleSymbiote = useUniverseStore((s) => s.toggleSymbiote)

  useEffect(() => {
    let step = 0
    let firstKeyAt = 0
    let lastCursor = { x: window.innerWidth / 2, y: window.innerHeight / 2 }

    const onMouseMove = (e: MouseEvent) => {
      lastCursor = { x: e.clientX, y: e.clientY }
    }

    const playInkCrawl = () => {
      // Reduced motion: skip the clip-path reveal; the token swap still fires.
      if (prefersReducedMotion()) return
      const ink = document.createElement('div')
      ink.className = 'symbiote-ink'
      ink.style.setProperty('--ink-x', `${lastCursor.x}px`)
      ink.style.setProperty('--ink-y', `${lastCursor.y}px`)
      document.body.appendChild(ink)
      window.setTimeout(() => ink.remove(), INK_DURATION_MS + 50)
    }

    const onKey = (e: KeyboardEvent) => {
      // Ignore typing inside form fields so the egg can't fire mid-edit.
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (target?.isContentEditable) return

      const key = e.key.toLowerCase()
      const now = performance.now()
      const expected = SEQUENCE[step]

      if (key !== expected) {
        // Allow the press to restart the sequence if it matches step 0.
        step = key === SEQUENCE[0] ? 1 : 0
        if (step === 1) firstKeyAt = now
        return
      }

      if (step === 0) firstKeyAt = now
      else if (now - firstKeyAt > WINDOW_MS) {
        step = key === SEQUENCE[0] ? 1 : 0
        if (step === 1) firstKeyAt = now
        return
      }

      step += 1
      if (step === SEQUENCE.length) {
        step = 0
        playInkCrawl()
        useAudioStore.getState().playFX('symbiote')
        toggleSymbiote()
      }
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [toggleSymbiote])

  return null
}
