import { prefersReducedMotion } from '../engine/motion'

// Pure math (tested) + the ScrollTrigger bindings that use it. GSAP is
// passed in so this module never imports it statically.

export function gutterProgress(seamTop: number, viewportH: number): number {
  return Math.min(1, Math.max(0, 1 - seamTop / viewportH))
}
export function captionOffset(b: number): number {
  if (b < 0.2) return -120
  if (b < 0.5) return -120 * (1 - (b - 0.2) / 0.3)
  if (b < 0.85) return 0
  return -120 * Math.min(1, (b - 0.85) / 0.15)
}
export function panelSettle(b: number): { y: number; rot: number } {
  return { y: (1 - b) * 18, rot: (1 - b) * -1.5 }
}

type GSAP = typeof import('gsap').gsap
type ST = typeof import('gsap/ScrollTrigger').ScrollTrigger

// Installs every ScrollTrigger under `root` and returns a teardown. Adds
// `has-motion` (comic.css hides enter/frame targets until GSAP reveals
// them) only here, so a failed GSAP import never leaves content hidden.
export function bindAll(root: HTMLElement, gsap: GSAP, ScrollTrigger: ST): () => void {
  if (prefersReducedMotion()) return () => {}
  root.classList.add('has-motion')
  const triggers: InstanceType<ST>[] = []

  // Gutters: seam progress drives the following panel's settle + the caption.
  root.querySelectorAll<HTMLElement>('[data-motion="gutter"]').forEach((g) => {
    const panel = g.parentElement?.querySelector<HTMLElement>('.comic-panel')
    const caption = g.querySelector<HTMLElement>('[data-motion="caption"]')
    if (!panel) return
    // Own the caption transform: without this GSAP bakes the CSS
    // translateX(-120%) into a pixel `x` and xPercent stacks on top of it.
    if (caption) gsap.set(caption, { x: 0, xPercent: captionOffset(0) })
    triggers.push(ScrollTrigger.create({
      trigger: g, start: 'top bottom', end: 'top top', scrub: true,
      onUpdate: (self) => {
        const { y, rot } = panelSettle(self.progress)
        gsap.set(panel, { y, rotation: rot, transformOrigin: 'left top' })
        if (caption) gsap.set(caption, { xPercent: captionOffset(self.progress) })
      },
    }))
  })

  // Splash still parallax ±6%.
  root.querySelectorAll<HTMLElement>('[data-motion="parallax"] img').forEach((img) => {
    const panel = img.closest<HTMLElement>('.comic-panel')
    if (!panel) return
    triggers.push(ScrollTrigger.create({
      trigger: panel, start: 'top bottom', end: 'bottom top', scrub: true,
      onUpdate: (self) => gsap.set(img, { yPercent: -6 + self.progress * 12, scale: 1.12 }),
    }))
  })

  // Staggered enters (once) and grid frames in reading order (once).
  root.querySelectorAll<HTMLElement>('.comic-panel').forEach((panel) => {
    const enters = panel.querySelectorAll<HTMLElement>('[data-motion="enter"]')
    const frames = panel.querySelectorAll<HTMLElement>('[data-motion="frame"]')
    if (enters.length) gsap.set(enters, { autoAlpha: 0, y: 20 })
    if (frames.length) gsap.set(frames, { autoAlpha: 0, y: 24, rotation: -1.5, transformOrigin: 'left top' })
    triggers.push(ScrollTrigger.create({
      trigger: panel, start: 'top 70%', once: true,
      onEnter: () => {
        const ease = toGsapEase(getComputedStyle(panel).getPropertyValue('--u-ease').trim())
        if (enters.length) gsap.to(enters, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease })
        if (frames.length) gsap.to(frames, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.5, stagger: 0.09, ease, delay: 0.15 })
        panel.dispatchEvent(new CustomEvent('comic:enter', { bubbles: false }))
      },
    }))
  })

  // Cover lift: scrubbed to the scroll (no wall-clock tween), so a visitor who
  // stops mid-scroll sees the cover half open and scrolling back re-closes it.
  // Unpinned on purpose: pinning with spacing leaves a viewport of invisible
  // cover to scroll through before page 1; scrubbing over the cover's own
  // height hands off to the 616 panel at the top exactly as the turn completes.
  const cover = root.querySelector<HTMLElement>('[data-motion="cover"]')
  if (cover) {
    gsap.set(cover, { transformPerspective: 1600, transformOrigin: 'left center' })
    const lift = gsap.timeline({ paused: true })
      .to(cover, { rotationY: -100, ease: 'none', duration: 0.8 }, 0)
      .to(cover, { autoAlpha: 0, ease: 'none', duration: 0.2 }, 0.8)
    triggers.push(ScrollTrigger.create({ trigger: cover, start: 'top top', end: 'bottom top', scrub: true, animation: lift }))
  }

  return () => {
    triggers.forEach((t) => t.kill())
    root.classList.remove('has-motion')
  }
}

// CSS eases → GSAP eases. steps(n) becomes a stepped ease; cubic-beziers map
// to the closest named GSAP ease so we don't ship CustomEase.
function toGsapEase(css: string): string {
  if (css.startsWith('steps')) return 'steps(5)'
  if (css.includes('1.56')) return 'back.out(1.6)'
  if (css.includes('0.45, 0')) return 'power2.inOut'
  return 'power4.out'
}
