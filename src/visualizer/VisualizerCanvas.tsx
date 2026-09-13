import { Component, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { AudioSignal } from './signal/types'
import { ParticleField } from './engine/ParticleField'
import { chooseDotCount } from './dotCount'
import { useUniverseStore } from '../store/universeStore'
import { prefersReducedMotion, onReducedMotionChange } from '../engine/motion'
import { DebugOverlay } from './debug/DebugOverlay'

export interface VisualizerCanvasProps {
  signal: AudioSignal          // mutated in place by the active provider
  nowSeconds: () => number     // playback position or wall clock
  trackKey: string             // changes → onTrackStart
  debug?: boolean
  onFallback?: () => void      // WebGL unavailable / shader failed
}

// Synchronous probe: a real GL context check, no async work, safe under
// jsdom (which has no WebGL and simply returns false).
function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function Field({ signal, nowSeconds, trackKey, debug }: VisualizerCanvasProps) {
  const gl = useThree((s) => s.gl)
  const n = useMemo(
    () =>
      chooseDotCount({
        dpr: window.devicePixelRatio || 1,
        cores: navigator.hardwareConcurrency || 8,
        width: window.innerWidth,
        override: new URLSearchParams(window.location.search).get('dots'),
      }),
    [],
  )
  const field = useMemo(() => new ParticleField(n, 1, prefersReducedMotion()), [n])
  const universe = useUniverseStore((s) => s.activeUniverse)
  const slow = useRef({ over: 0, halved: false })
  const [, force] = useState(0)

  useEffect(() => field.setPalette(universe), [field, universe])
  useEffect(() => onReducedMotionChange((r) => field.setReducedMotion(r)), [field])
  useEffect(() => { field.onTrackStart(nowSeconds()) }, [field, trackKey, nowSeconds])
  useEffect(() => () => field.dispose(), [field])

  useFrame((_, dt) => {
    field.update(signal, nowSeconds(), dt)
    // spec §7: > 24 ms for 2 s → halve N once
    if (!slow.current.halved) {
      slow.current.over = dt > 0.024 ? slow.current.over + dt : 0
      if (slow.current.over >= 2) {
        field.halve()
        slow.current.halved = true
        force((x) => x + 1)
      }
    }
  })

  useEffect(() => {
    // r184 exposes context-loss via the canvas element
    const el = gl.domElement
    const onLost = (e: Event) => e.preventDefault()
    el.addEventListener('webglcontextlost', onLost)
    return () => el.removeEventListener('webglcontextlost', onLost)
  }, [gl])

  return (
    <>
      <primitive object={field.points} />
      {debug && <DebugOverlay field={field} signal={signal} />}
    </>
  )
}

interface ErrorBoundaryProps {
  onFallback?: () => void
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

// Catches a runtime shader/GL failure inside <Canvas> (R3F has no onError
// prop for this). The synchronous WebGL probe in VisualizerCanvas covers
// the "no WebGL at all" case before Canvas ever mounts.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(): void {
    this.props.onFallback?.()
  }

  render(): ReactNode {
    if (this.state.failed) return null
    return this.props.children
  }
}

export function VisualizerCanvas(props: VisualizerCanvasProps) {
  const [failed, setFailed] = useState(() => !hasWebGL())
  const reported = useRef(false)

  useEffect(() => {
    if (failed && !reported.current) {
      reported.current = true
      props.onFallback?.()
    }
  }, [failed, props])

  if (failed) return null

  return (
    <div className="viz-canvas" aria-hidden="true">
      <ErrorBoundary onFallback={() => setFailed(true)}>
        <Canvas
          camera={{ position: [0, 0, 4.2], fov: 55, near: 0.1, far: 50 }}
          dpr={[1, 1.5]}
          gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => { gl.setClearColor(0x000000, 0) }}
        >
          <Field {...props} />
        </Canvas>
      </ErrorBoundary>
    </div>
  )
}
