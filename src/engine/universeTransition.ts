import * as THREE from 'three'
import gsap from 'gsap'
import glitchFrag from '../shaders/glitch.frag?raw'
import { useUniverseStore, type Universe } from '../store/universeStore'
import { useAudioStore } from '../store/audioStore'
import { prefersReducedMotion } from './motion'

// Universe-switch glitch overlay.
// uIntensity ramps 0 -> 1 over 300ms, fires onMidpoint at the peak, then
// ramps 1 -> 0 over 300ms. The midpoint is where the DOM swap should happen
// so the user sees the shred mask both before and after the swap.

const VERT = /* glsl */ `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`

const PRIMARY_RGB: Record<Universe, [number, number, number]> = {
  'earth-1610': [1.0, 0.176, 0.176],   // #ff2d2d
  'earth-65':   [0.431, 0.776, 0.961], // #6ec6f5
  'earth-138':  [0.910, 0.831, 0.302], // #e8d44d
  'earth-928':  [0.0, 0.831, 1.0],     // #00d4ff
}

let inFlight = false
let pending: { to: Universe; onMidpoint: () => void } | null = null

export function triggerUniverseTransition(
  from: Universe,
  to: Universe,
  onMidpoint: () => void,
): void {
  // Reduced motion: skip the glitch overlay; just swap the universe.
  if (prefersReducedMotion()) {
    onMidpoint()
    return
  }

  if (inFlight) {
    // Queue the latest target — older queued ones get overwritten.
    pending = { to, onMidpoint }
    return
  }
  inFlight = true

  // Fire glitch FX at the start of the transition so the audio builds with
  // the visual intensity ramp (peak ~300ms in). audioStore gates on
  // isUnlocked + !isMuted.
  useAudioStore.getState().playFX('glitch')

  const canvas = document.createElement('canvas')
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 9999;
  `
  canvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(canvas)

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
    uIntensity: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uColorA: { value: new THREE.Vector3(...PRIMARY_RGB[from]) },
    uColorB: { value: new THREE.Vector3(...PRIMARY_RGB[to]) },
  }

  const geometry = new THREE.PlaneGeometry(2, 2)
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: glitchFrag,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  const t0 = performance.now()
  let raf = 0
  let alive = true
  const tick = () => {
    if (!alive) return
    uniforms.uTime.value = (performance.now() - t0) / 1000
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }
  tick()

  const dispose = () => {
    if (!alive) return
    alive = false
    cancelAnimationFrame(raf)
    geometry.dispose()
    material.dispose()
    renderer.dispose()
    canvas.remove()
    inFlight = false
    if (pending) {
      const next = pending
      pending = null
      // Fire after a microtask so the canvas is fully gone first.
      queueMicrotask(() => {
        const cur = useUniverseStore.getState().activeUniverse
        if (cur !== next.to) {
          triggerUniverseTransition(cur, next.to, next.onMidpoint)
        }
      })
    }
  }

  gsap
    .timeline()
    .to(uniforms.uIntensity, {
      value: 1,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: onMidpoint,
    })
    .to(uniforms.uIntensity, {
      value: 0,
      duration: 0.3,
      ease: 'power2.out',
      onComplete: dispose,
    })
}

// Convenience: wrap setUniverse in a glitch transition. Called by UniverseShell
// (and anything else that wants to change universes with the comic effect).
export function requestUniverseChange(target: Universe): void {
  const store = useUniverseStore.getState()
  if (store.activeUniverse === target) return
  triggerUniverseTransition(store.activeUniverse, target, () => {
    useUniverseStore.getState().setUniverse(target)
  })
}
