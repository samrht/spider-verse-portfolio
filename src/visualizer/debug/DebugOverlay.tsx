import { useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { ParticleField } from '../engine/ParticleField'
import type { AudioSignal } from '../signal/types'

// ?debug readout. Polls at 10 Hz (not per frame) to keep React out of the
// render loop. Frames are counted in a ref from useFrame; the poll turns the
// count into an EMA fps and re-renders.
export function DebugOverlay({ field, signal }: { field: ParticleField; signal: AudioSignal }) {
  const frames = useRef(0)
  useFrame(() => { frames.current += 1 })
  const [stats, setStats] = useState({ fps: 0 })
  useEffect(() => {
    let last = performance.now()
    let fps = 0
    const id = window.setInterval(() => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      const inst = dt > 0 ? frames.current / dt : 0
      frames.current = 0
      fps = fps === 0 ? inst : fps + (inst - fps) * 0.3
      setStats({ fps })
    }, 100)
    return () => window.clearInterval(id)
  }, [])
  const bar = (v: number) => '█'.repeat(Math.round(v * 20)).padEnd(20, '·')
  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      <pre className="viz-debug">
{`mode     ${signal.mode}
bass     ${bar(signal.bass)} ${signal.bass.toFixed(2)}
mids     ${bar(signal.mids)} ${signal.mids.toFixed(2)}
highs    ${bar(signal.highs)} ${signal.highs.toFixed(2)}
energy   ${bar(signal.energy)} ${signal.energy.toFixed(2)}
beat     ${bar(signal.beat)}
section  #${signal.section.index} ${signal.section.energy}
morph    ${field.morph.from} → ${field.morph.to} ${(field.morph.progress * 100).toFixed(0)}%
dots     ${field.n}
fps      ${stats.fps.toFixed(0)}`}
      </pre>
    </Html>
  )
}
