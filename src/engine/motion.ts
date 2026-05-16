// Shared reduced-motion gate.
// CSS-keyframed motion is already neutralized in animations.css; this helper
// covers the GSAP- and JS-driven paths (loader, cursor lag, spider-sense
// rings, ink-crawl, universe glitch overlay, Bugle fold).

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Subscribe to live changes (user toggles the OS preference). Returns a
// teardown function that removes the listener.
export function onReducedMotionChange(
  cb: (reduce: boolean) => void,
): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  const handler = (e: MediaQueryListEvent) => cb(e.matches)
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
