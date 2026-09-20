import * as THREE from 'three'
import vert from './shaders/points.vert?raw'
import frag from './shaders/points.frag?raw'
import type { AudioSignal } from '../signal/types'
import type { Universe } from '../../store/universeStore'
import { MorphMachine, type TargetName } from './morph'
import { bakeTarget } from '../targets'
import { paletteFor } from './palette'
import { MonotonicClock } from './clock'

// Owns the Three objects for the field. No React, no DOM: VisualizerCanvas
// mounts `points` and calls update() from useFrame. Attributes are baked
// targets; per-frame work is six uniform writes.

const SMOOTH = { attack: 0.5, release: 0.12 }

export class ParticleField {
  readonly points: THREE.Points
  readonly morph: MorphMachine
  n: number
  private readonly seed: number
  private geometry: THREE.BufferGeometry
  private readonly material: THREE.ShaderMaterial
  private readonly u: {
    uMorph: THREE.IUniform<number>
    uBass: THREE.IUniform<number>
    uMids: THREE.IUniform<number>
    uHighs: THREE.IUniform<number>
    uBeat: THREE.IUniform<number>
    uTime: THREE.IUniform<number>
    uPointScale: THREE.IUniform<number>
    uBreath: THREE.IUniform<number>
    uPalette: THREE.IUniform<THREE.Color[]>
  }
  private reduced = false
  private sm = { bass: 0, mids: 0, highs: 0 }
  // R13: the morph machine is clocked from accumulated frame dt, never from
  // playback position (which stays the BeatMap lookup key in useSignal).
  private readonly clock = new MonotonicClock()

  constructor(n: number, seed = 1, reducedMotion = false) {
    this.n = n
    this.seed = seed
    this.reduced = reducedMotion
    this.morph = new MorphMachine({ enabled: !reducedMotion })
    this.u = {
      uMorph: { value: 1 },
      uBass: { value: 0 },
      uMids: { value: 0 },
      uHighs: { value: 0 },
      uBeat: { value: 0 },
      uTime: { value: 0 },
      uPointScale: { value: 6 },
      uBreath: { value: reducedMotion ? 0.125 : 0.25 },
      uPalette: { value: paletteFor('earth-1610') },
    }
    this.material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: this.u,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.geometry = this.buildGeometry(n, 'sphere', 'sphere')
    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
  }

  private buildGeometry(n: number, from: TargetName, to: TargetName): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry()
    const a = bakeTarget(from, n, this.seed)
    const b = bakeTarget(to, n, this.seed)
    const seeds = new Float32Array(n)
    for (let i = 0; i < n; i++) seeds[i] = ((i * 2654435761) >>> 0) / 4294967296
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    g.setAttribute('aTargetA', new THREE.BufferAttribute(Float32Array.from(a), 3))
    g.setAttribute('aTargetB', new THREE.BufferAttribute(Float32Array.from(b), 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    return g
  }

  setPalette(u: Universe): void {
    this.u.uPalette.value = paletteFor(u)
  }

  setReducedMotion(v: boolean): void {
    this.reduced = v
    this.u.uBreath.value = v ? 0.125 : 0.25
  }

  onTrackStart(): void {
    this.morph.onTrackStart(this.clock.now)
  }

  private startMorph(to: TargetName): void {
    // Freeze the current blended pose as the new A so a mid-transition
    // retarget never snaps.
    const a = this.geometry.getAttribute('aTargetA') as THREE.BufferAttribute
    const b = this.geometry.getAttribute('aTargetB') as THREE.BufferAttribute
    const t = smoothstep(this.u.uMorph.value)
    const arr = a.array as Float32Array
    const brr = b.array as Float32Array
    for (let i = 0; i < arr.length; i++) arr[i] = arr[i] + (brr[i] - arr[i]) * t
    brr.set(bakeTarget(to, this.n, this.seed))
    a.needsUpdate = true
    b.needsUpdate = true
    this.u.uMorph.value = 0
  }

  update(sig: AudioSignal, dt: number): void {
    const nowS = this.clock.tick(dt)
    this.morph.onSection(sig.section.index, sig.section.energy, nowS)
    const ev = this.morph.update(nowS)
    if (ev) this.startMorph(ev.to)
    this.u.uMorph.value = this.morph.progress

    this.sm.bass += (sig.bass - this.sm.bass) * (sig.bass > this.sm.bass ? SMOOTH.attack : SMOOTH.release)
    this.sm.mids += (sig.mids - this.sm.mids) * (sig.mids > this.sm.mids ? SMOOTH.attack : SMOOTH.release)
    this.sm.highs += (sig.highs - this.sm.highs) * (sig.highs > this.sm.highs ? SMOOTH.attack : SMOOTH.release)
    this.u.uBass.value = this.sm.bass
    this.u.uMids.value = this.sm.mids
    this.u.uHighs.value = this.sm.highs
    this.u.uBeat.value = this.reduced ? 0 : sig.beat
    this.u.uTime.value += dt
  }

  // Frame-time guard from spec §7: rebuild at half N, once. Rebake the
  // morph's current from/to shapes (not 'sphere'/'sphere') so the field
  // doesn't snap to a sphere mid-morph; update() keeps driving uMorph from
  // morph.progress every frame, so no uniform write is needed here.
  halve(): void {
    const n = Math.max(1000, Math.floor(this.n / 2))
    const old = this.geometry
    this.n = n
    this.geometry = this.buildGeometry(n, this.morph.from, this.morph.to)
    this.points.geometry = this.geometry
    old.dispose()
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}

function smoothstep(x: number): number {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}
