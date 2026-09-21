import { useEffect } from 'react'
import { prefersReducedMotion } from '../engine/motion'

// Loads GSAP + ScrollTrigger after mount and binds all comic motion. The
// `has-motion` class is only added by bindAll, inside the resolved import,
// so a failed load leaves the page fully visible and static.
export function useComicMotion(): void {
  useEffect(() => {
    if (prefersReducedMotion()) return
    const root = document.querySelector<HTMLElement>('.comic-page')
    if (!root) return
    let teardown: (() => void) | null = null
    let cancelled = false
    Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('./motion'), import('./flourish')]).then(
      ([{ gsap }, { ScrollTrigger }, motion, flourish]) => {
        if (cancelled) return
        gsap.registerPlugin(ScrollTrigger)
        const a = motion.bindAll(root, gsap, ScrollTrigger)
        const b = flourish.bindFlourishes(root, gsap)
        ScrollTrigger.refresh()
        teardown = () => { a(); b() }
      },
    )
    return () => { cancelled = true; teardown?.() }
  }, [])
}
