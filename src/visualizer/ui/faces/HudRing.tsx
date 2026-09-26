import { useRef } from 'react'
import type { PointerEvent } from 'react'
import type { FaceProps } from './index'
import { arcToTime } from './arc'
import { ScrubRange, Times, ShuffleButton, PrevButton, PlayButton, NextButton, RepeatButton, VolumeRange, ListButton, HideButton } from './parts'
import '../../../styles/faces/hud.css'

const R = 26
const CIRC = 2 * Math.PI * R

// MCU: Stark HUD ring (spec §4.2). The outer arc is progress and seeks by
// pointer; the Track progress range stays in the DOM (visually hidden) as
// the keyboard / screen-reader control.
export function HudRing({ c }: FaceProps) {
  const dragging = useRef(false)
  const seekAt = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    c.seek(arcToTime(e.clientX, e.clientY, r.left + r.width / 2, r.top + r.height / 2, c.duration))
  }
  return (
    <div className="face-hud" data-face="hud-ring">
      <div className="hud-ring">
        <svg
          viewBox="0 0 64 64" className="hud-arc" aria-hidden="true"
          onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); seekAt(e) }}
          onPointerMove={(e) => { if (dragging.current) seekAt(e) }}
          onPointerUp={() => { dragging.current = false }}
        >
          <circle cx="32" cy="32" r={R} className="hud-arc-track" />
          <circle cx="32" cy="32" r={R} className="hud-arc-fill" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - c.pct / 100)} transform="rotate(-90 32 32)" />
        </svg>
        <PlayButton c={c} className="hud-play" />
      </div>
      <div className="hud-now">
        <p className="hud-readout">F.R.I.D.A.Y. // AUDIO · {c.movieLabel}</p>
        <h2 className="hud-title">{c.track.title}</h2>
        <p className="hud-artist">{c.track.artist}</p>
        <ScrubRange c={c} className="face-sr" />
        <Times c={c} className="hud-times" />
      </div>
      <div className="hud-transport">
        <ShuffleButton c={c} className="hud-btn" />
        <PrevButton c={c} className="hud-btn" />
        <NextButton c={c} className="hud-btn" />
        <RepeatButton c={c} className="hud-btn" />
        <VolumeRange c={c} className="hud-volume" />
        <ListButton c={c} className="hud-btn" />
        <HideButton c={c} className="hud-btn" />
      </div>
    </div>
  )
}
