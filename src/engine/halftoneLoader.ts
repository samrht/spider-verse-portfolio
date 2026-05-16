import * as THREE from 'three'
import gsap from 'gsap'
import halftoneFrag from '../shaders/halftone.frag?raw'
import { prefersReducedMotion } from './motion'

// Cinematic intro: full-screen Three.js plane running halftone.frag.
// uProgress is animated 0 -> 1 over 2.5s; promise resolves on completion.
// Concurrently, SVG threads "drop" from the top via plain DOM/GSAP so the
// hero behind the canvas gets a comic-book reveal as the halftone dissolves.

const VERT = /* glsl */ `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`

const LOADER_DURATION = 2.5

export interface HalftoneLoaderHandle {
  done: Promise<void>
  cancel: () => void
}

export function initHalftoneLoader(canvas: HTMLCanvasElement): HalftoneLoaderHandle {
  // Reduced motion: skip the 2.5s WebGL intro entirely.
  if (prefersReducedMotion()) {
    return {
      done: Promise.resolve(),
      cancel: () => {},
    }
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  }

  const geometry = new THREE.PlaneGeometry(2, 2)
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: halftoneFrag,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  let raf = 0
  let alive = true
  const t0 = performance.now()

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false)
    uniforms.uResolution.value.set(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', resize)

  const tick = () => {
    if (!alive) return
    uniforms.uTime.value = (performance.now() - t0) / 1000
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }
  tick()

  // Concurrent thread-drop overlay
  const threadLayer = createThreadDropLayer()
  document.body.appendChild(threadLayer)

  const dispose = () => {
    if (!alive) return
    alive = false
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    geometry.dispose()
    material.dispose()
    renderer.dispose()
    threadLayer.remove()
  }

  const done = new Promise<void>((resolve) => {
    gsap.to(uniforms.uProgress, {
      value: 1,
      duration: LOADER_DURATION,
      ease: 'power2.inOut',
      onComplete: () => {
        dispose()
        resolve()
      },
    })
  })

  return {
    done,
    cancel: () => {
      gsap.killTweensOf(uniforms.uProgress)
      dispose()
    },
  }
}

function createThreadDropLayer(): HTMLDivElement {
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText = `
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 10000;
    overflow: hidden;
  `

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  svg.style.cssText = 'position:absolute; inset:0; overflow:visible;'
  layer.appendChild(svg)

  const threadCount = 9
  const vw = window.innerWidth
  const vh = window.innerHeight

  for (let i = 0; i < threadCount; i++) {
    const x = (vw / (threadCount + 1)) * (i + 1) + (Math.random() - 0.5) * 60
    const len = vh * (0.4 + Math.random() * 0.5)
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', String(x))
    line.setAttribute('x2', String(x))
    line.setAttribute('y1', '0')
    line.setAttribute('y2', String(len))
    line.setAttribute('stroke', 'var(--universe-primary, #ff2d2d)')
    line.setAttribute('stroke-width', '1.25')
    line.setAttribute('stroke-linecap', 'round')
    line.style.filter = 'drop-shadow(0 0 4px var(--universe-primary))'
    line.style.transformOrigin = 'top'
    line.style.transform = 'scaleY(0)'
    svg.appendChild(line)

    gsap.to(line, {
      scaleY: 1,
      duration: 0.6 + Math.random() * 0.5,
      delay: 0.15 + i * 0.07 + Math.random() * 0.2,
      ease: 'power3.in',
    })
    gsap.to(line, {
      opacity: 0,
      duration: 0.5,
      delay: LOADER_DURATION - 0.4,
      ease: 'power1.out',
    })
  }

  return layer
}
