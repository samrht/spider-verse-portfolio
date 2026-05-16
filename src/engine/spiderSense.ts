import gsap from 'gsap'
import { prefersReducedMotion } from './motion'

// Spider-Sense hover effect:
// - Scans the DOM for [data-spider-sense] elements
// - On mouseenter: 3 staggered expanding rings + chromatic-aberration filter
// - On mouseleave: cleanup
//
// Section-sized targets (e.g. UniverseShell) are filtered out because
// viewport-spanning rings look terrible. We keep the data-attribute on those
// elements as a semantic marker but don't decorate them.

const MAX_AREA_RATIO = 0.4 // skip elements covering >40% of the viewport
const MANAGED_ATTR = 'data-spider-sense-bound'

interface Bound {
  el: HTMLElement
  onEnter: (e: MouseEvent) => void
  onLeave: (e: MouseEvent) => void
}

export function initSpiderSense(): () => void {
  if (typeof window === 'undefined') return () => {}
  // Reduced motion: don't bind anything. Spider-sense is pure flair.
  if (prefersReducedMotion()) return () => {}

  const bound: Bound[] = []

  const attach = (el: HTMLElement) => {
    if (el.hasAttribute(MANAGED_ATTR)) return
    el.setAttribute(MANAGED_ATTR, '')

    const onEnter = () => {
      const rect = el.getBoundingClientRect()
      const vpArea = window.innerWidth * window.innerHeight
      if (rect.width * rect.height > vpArea * MAX_AREA_RATIO) return

      // Ensure positioning context for absolute rings
      const cs = getComputedStyle(el)
      if (cs.position === 'static') el.style.position = 'relative'

      const layer = document.createElement('div')
      layer.className = 'spider-sense-rings'
      layer.setAttribute('aria-hidden', 'true')
      layer.style.cssText = `
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 1;
        overflow: visible;
      `
      el.appendChild(layer)

      const rings: HTMLDivElement[] = []
      for (let i = 0; i < 3; i++) {
        const ring = document.createElement('div')
        ring.style.cssText = `
          position: absolute;
          inset: 0;
          border: 2px solid var(--universe-primary, #ff2d2d);
          opacity: 0;
          pointer-events: none;
          will-change: transform, opacity;
        `
        layer.appendChild(ring)
        rings.push(ring)
      }

      gsap.fromTo(
        rings,
        { scale: 1, opacity: 1 },
        {
          scale: 2.5,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          stagger: 0.15,
          transformOrigin: '50% 50%',
        },
      )

      // Chromatic aberration sim
      el.style.filter = 'hue-rotate(20deg) saturate(1.5)'
      el.style.transition = 'filter 200ms ease'

      el.dataset.senseLayer = '1'
      ;(el as HTMLElement & { _senseLayer?: HTMLDivElement })._senseLayer = layer
    }

    const onLeave = () => {
      const layer = (el as HTMLElement & { _senseLayer?: HTMLDivElement })._senseLayer
      if (layer) {
        gsap.killTweensOf(layer.children)
        layer.remove()
        delete (el as HTMLElement & { _senseLayer?: HTMLDivElement })._senseLayer
      }
      el.style.filter = ''
    }

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    bound.push({ el, onEnter, onLeave })
  }

  const scan = (root: ParentNode) => {
    const nodes = root.querySelectorAll<HTMLElement>('[data-spider-sense]')
    nodes.forEach(attach)
  }

  scan(document)

  // Watch for dynamically added cards
  const observer = new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return
        const el = n as HTMLElement
        if (el.matches('[data-spider-sense]')) attach(el)
        scan(el)
      })
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })

  return () => {
    observer.disconnect()
    for (const b of bound) {
      b.el.removeEventListener('mouseenter', b.onEnter)
      b.el.removeEventListener('mouseleave', b.onLeave)
      b.el.removeAttribute(MANAGED_ATTR)
      const layer = (b.el as HTMLElement & { _senseLayer?: HTMLDivElement })._senseLayer
      layer?.remove()
      b.el.style.filter = ''
    }
  }
}
