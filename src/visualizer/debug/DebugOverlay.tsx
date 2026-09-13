import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import type { ParticleField } from '../engine/ParticleField'
import type { AudioSignal } from '../signal/types'

// ?debug readout. Polls at 10 Hz (not per frame) to keep React out of the
// render loop.
export function DebugOverlay({ field, signal }: { field: ParticleField; signal: AudioSignal }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((t) => t + 1), 100)
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
dots     ${field.n}`}
      </pre>
    </Html>
  )
}
