import { useCallback, useEffect, useState } from 'react'
import type { RefObject } from 'react'

// Fullscreen for the /mixtape page element. `active` follows the browser's
// own state, so Esc (which exits without our help) is reflected too.
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const supported = typeof document !== 'undefined' && !!document.fullscreenEnabled
  const [active, setActive] = useState(false)

  useEffect(() => {
    const onChange = () => setActive(document.fullscreenElement === ref.current && ref.current !== null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [ref])

  const toggle = useCallback(async () => {
    const el = ref.current
    if (!supported || !el) return
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await el.requestFullscreen()
    } catch {
      // Refused (no user gesture, iframe policy): stay as we are.
    }
  }, [ref, supported])

  return { supported, active, toggle }
}
