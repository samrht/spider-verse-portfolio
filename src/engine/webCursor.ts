import gsap from 'gsap'
import { prefersReducedMotion } from './motion'
import { useAudioStore } from '../store/audioStore'

// Full-spec web cursor:
// - Hides the native cursor on <html>
// - Elastic dot follows the mouse via GSAP quickTo (power3, 0.3s)
// - On click, draws an SVG "web" path from the dot to a random anchor and
//   reels it back out via stroke-dashoffset animation
// - Thread color tracks the active universe via --universe-primary
// Returns a cleanup function that fully restores the page.

const CURSOR_ID = 'spider-cursor'
const SVG_ID = 'web-threads-svg'
const STYLE_ID = 'spider-cursor-style'
const HISTORY_LIMIT = 3

interface MousePoint {
  x: number
  y: number
}

export function initCursor(): () => void {
  if (typeof window === 'undefined') return () => {}
  // Touch / non-hover devices: don't hijack the system cursor.
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const noHover = window.matchMedia('(hover: none)').matches
  if (coarse || noHover) return () => {}

  const reduceMotion = prefersReducedMotion()

  injectBaseStyles()
  const root = document.documentElement
  const prevCursor = root.style.cursor
  root.style.cursor = 'none'

  const dot = createDot()
  const svg = createSvgLayer()
  document.body.append(dot, svg)

  // Snap-to in reduced-motion mode; elastic lag otherwise.
  const xTo = gsap.quickTo(dot, 'x', { duration: reduceMotion ? 0 : 0.3, ease: 'power3' })
  const yTo = gsap.quickTo(dot, 'y', { duration: reduceMotion ? 0 : 0.3, ease: 'power3' })

  const history: MousePoint[] = []
  let lastX = window.innerWidth / 2
  let lastY = window.innerHeight / 2

  const onMove = (e: MouseEvent) => {
    lastX = e.clientX
    lastY = e.clientY
    xTo(lastX)
    yTo(lastY)
    history.push({ x: lastX, y: lastY })
    if (history.length > HISTORY_LIMIT) history.shift()
  }

  const onDown = () => dot.classList.add('is-pressed')
  const onUp = () => dot.classList.remove('is-pressed')

  const onClick = (e: MouseEvent) => {
    if (reduceMotion) return
    fireWebShoot(svg, { x: e.clientX, y: e.clientY })
    // Matches the visual web-thread spawn. audioStore gates on
    // isUnlocked + !isMuted, so the symbiote toggle still wins.
    useAudioStore.getState().playFX('webshot')
  }

  // Hover hint over clickable elements
  const onOver = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    if (!target) return
    if (target.closest('a, button, [role="button"], [data-spider-sense]')) {
      dot.classList.add('is-hover')
    } else {
      dot.classList.remove('is-hover')
    }
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mousedown', onDown)
  window.addEventListener('mouseup', onUp)
  window.addEventListener('click', onClick)
  document.addEventListener('mouseover', onOver)

  // Place dot at viewport center until first mousemove
  xTo(lastX)
  yTo(lastY)

  return () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mousedown', onDown)
    window.removeEventListener('mouseup', onUp)
    window.removeEventListener('click', onClick)
    document.removeEventListener('mouseover', onOver)
    dot.remove()
    svg.remove()
    document.getElementById(STYLE_ID)?.remove()
    root.style.cursor = prevCursor
  }
}

function injectBaseStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    html, body, a, button, [role="button"] { cursor: none !important; }

    #${CURSOR_ID} {
      position: fixed;
      top: 0;
      left: 0;
      width: 14px;
      height: 14px;
      margin: -7px 0 0 -7px;
      border-radius: 50%;
      background: var(--universe-primary, #ff2d2d);
      box-shadow:
        0 0 12px var(--universe-primary, #ff2d2d),
        0 0 24px var(--universe-primary, #ff2d2d);
      mix-blend-mode: difference;
      pointer-events: none;
      z-index: 9998;
      transform: translate3d(0, 0, 0);
      will-change: transform;
      transition: width 180ms ease, height 180ms ease, margin 180ms ease;
    }
    /* Earth-65 (Gwen) is a light watercolour palette — mix-blend-mode: difference
       reads as a muddy teal blob on it. Drop the blend mode on that universe so
       the cursor renders as its solid pink primary, with a darker ink halo. */
    [data-universe="earth-65"] #${CURSOR_ID} {
      mix-blend-mode: normal;
      background: var(--universe-primary, #6ec6f5);
      box-shadow:
        0 0 0 1.5px rgba(45, 31, 61, 0.55),
        0 0 14px var(--universe-primary, #6ec6f5);
    }
    #${CURSOR_ID}.is-hover {
      width: 26px;
      height: 26px;
      margin: -13px 0 0 -13px;
      background: transparent;
      border: 2px solid var(--universe-primary, #ff2d2d);
    }
    [data-universe="earth-65"] #${CURSOR_ID}.is-hover {
      border-color: var(--universe-text, #2d1f3d);
      box-shadow: 0 0 12px var(--universe-primary, #6ec6f5);
    }
    #${CURSOR_ID}.is-pressed {
      transform: scale(0.6);
    }

    #${SVG_ID} {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9997;
      overflow: visible;
    }
    #${SVG_ID} path {
      fill: none;
      stroke: var(--universe-primary, #ff2d2d);
      stroke-width: 1.25;
      stroke-linecap: round;
      filter: drop-shadow(0 0 4px var(--universe-primary, #ff2d2d));
    }
  `
  document.head.appendChild(style)
}

function createDot(): HTMLDivElement {
  const dot = document.createElement('div')
  dot.id = CURSOR_ID
  dot.setAttribute('aria-hidden', 'true')
  return dot
}

function createSvgLayer(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.id = SVG_ID
  svg.setAttribute('aria-hidden', 'true')
  return svg
}

function fireWebShoot(svg: SVGSVGElement, origin: MousePoint) {
  const anchor = pickAnchor(origin)
  const midX = (origin.x + anchor.x) / 2 + (Math.random() - 0.5) * 80
  const midY = (origin.y + anchor.y) / 2 + (Math.random() - 0.5) * 80
  const d = `M ${origin.x} ${origin.y} Q ${midX} ${midY} ${anchor.x} ${anchor.y}`

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  svg.appendChild(path)

  const len = path.getTotalLength()
  path.style.strokeDasharray = `${len}`
  path.style.strokeDashoffset = `${len}`

  gsap
    .timeline({ onComplete: () => path.remove() })
    .to(path, { strokeDashoffset: 0, duration: 0.18, ease: 'power2.out' })
    .to(path, { strokeDashoffset: -len, duration: 0.42, ease: 'power3.in' })
}

function pickAnchor(origin: MousePoint): MousePoint {
  // Bias toward the four screen quadrants so threads feel like they catch a wall.
  const margin = 24
  const candidates: MousePoint[] = [
    { x: margin, y: margin },
    { x: window.innerWidth - margin, y: margin },
    { x: margin, y: window.innerHeight - margin },
    { x: window.innerWidth - margin, y: window.innerHeight - margin },
    { x: window.innerWidth / 2, y: margin },
  ]
  // Pick the farthest-ish anchor for visual drama
  let best = candidates[0]
  let bestDist = -Infinity
  for (const c of candidates) {
    const d = Math.hypot(c.x - origin.x, c.y - origin.y)
    const jitter = Math.random() * 200
    if (d + jitter > bestDist) {
      bestDist = d + jitter
      best = c
    }
  }
  return best
}
