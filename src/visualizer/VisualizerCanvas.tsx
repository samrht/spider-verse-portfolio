import { Component, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { AudioSignal } from './signal/types'
import { ParticleField } from './engine/ParticleField'
import { chooseDotCount } from './dotCount'
import { useUniverseStore } from '../store/universeStore'
import { prefersReducedMotion, onReducedMotionChange } from '../engine/motion'
import { DebugOverlay } from './debug/DebugOverlay'
import type { FrameSink } from './capture/useClipRecorder'
import { guardStep, type GuardState } from './frameGuard'

export interface VisualizerCanvasProps {
  signal: AudioSignal          // mutated in place by the active provider
  trackKey: string             // changes → onTrackStart
  debug?: boolean
  onFallback?: () => void      // WebGL unavailable / shader failed
  onDegrade?: () => void       // frames still slow after the halve (verse drops its CSS split)
  capture?: FrameSink | null   // clip recording: receives each rendered frame
  paletteOverride?: [string, string, string] | null  // album-art colours, or null for the universe palette
}

// Synchronous probe: a real GL context check, no async work, safe under
// jsdom (which has no WebGL and simply returns false).
function hasWebGL(): boolean {
  if (typeof WebGLRenderingContext === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    const ctx = c.getContext('webgl2') || c.getContext('webgl')
    if (!ctx) return false
    // Release the probe context: browsers cap live WebGL contexts per page.
    ctx.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

function Field({ signal, trackKey, debug, onDegrade, capture, paletteOverride }: VisualizerCanvasProps) {
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
  const guard = useRef<GuardState>({ over: 0, trips: 0 })
  const [, force] = useState(0)

  const firstUniverse = useRef(true)
  useEffect(() => {
    field.setUniverse(universe, firstUniverse.current)
    firstUniverse.current = false
  }, [field, universe])
  useEffect(() => { field.setPaletteOverride(paletteOverride ?? null) }, [field, paletteOverride])
  useEffect(() => onReducedMotionChange((r) => field.setReducedMotion(r)), [field])
  // R14: only a real track change replays the emblem (the field keeps its
  // own monotonic clock, so no time argument is needed).
  useEffect(() => { field.onTrackStart() }, [field, trackKey])
  useEffect(() => () => field.dispose(), [field])

  useFrame((_, dt) => {
    field.update(signal, dt)
    // spec §7: > 24 ms for 2 s → halve N; a second 2 s → onDegrade. A backgrounded tab can
    // resume with a multi-second dt; frameGuard's nextOver treats that as
    // a stall and resets rather than accumulating.
    const { next, action } = guardStep(guard.current, dt)
    guard.current = next
    if (action === 'halve') { field.halve(); force((x) => x + 1) }
    if (action === 'degrade') onDegrade?.()
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
      {capture && <CaptureTap sink={capture} />}
    </>
  )
}

// Mounted only while a clip records. A priority-1 useFrame takes over R3F's
// render for that frame, so the WebGL drawing buffer is copied into the clip
// canvas in the same tick it was drawn (without preserveDrawingBuffer the
// buffer is cleared once the browser presents it).
function CaptureTap({ sink }: { sink: FrameSink }) {
  useFrame(({ gl, scene, camera }) => {
    gl.render(scene, camera)
    sink.draw(gl.domElement)
  }, 1)
  return null
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
  const onFallback = useRef(props.onFallback)
  useEffect(() => { onFallback.current = props.onFallback })

  useEffect(() => {
    if (failed && !reported.current) {
      reported.current = true
      onFallback.current?.()
    }
  }, [failed])

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
