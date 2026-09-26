import type { CSSProperties, ReactNode } from 'react'
import { fmt, type DeckControls } from '../useDeckControls'

// Shared deck controls (spec §4.1). Every face composes these so the
// accessible names, focus order and wiring are identical in all four
// universes; faces only arrange and style them.

interface PartProps { c: DeckControls; className?: string; children?: ReactNode }

export function ScrubRange({ c, className = '' }: PartProps) {
  return (
    <input
      type="range" min={0} max={c.duration || 0} step={0.1} value={c.progress}
      onChange={(e) => c.seek(parseFloat(e.target.value))}
      aria-label="Track progress" className={className}
      style={{ '--mixtape-pct': `${c.pct}%` } as CSSProperties}
    />
  )
}

export function Times({ c, className = 'mixtape-now-time' }: PartProps) {
  return <div className={className}><span>{fmt(c.progress)}</span><span>{fmt(c.duration)}</span></div>
}

export function ShuffleButton({ c, className = '', children }: PartProps) {
  return <button type="button" onClick={c.toggleShuffle} className={`${className} ${c.shuffle ? 'is-active' : ''}`.trim()} aria-label="Toggle shuffle" aria-pressed={c.shuffle} data-spider-sense>{children ?? '⇌'}</button>
}

export function PrevButton({ c, className = '', children }: PartProps) {
  return <button type="button" onClick={c.prev} className={className} aria-label="Previous track" data-spider-sense>{children ?? '⏮'}</button>
}

export function PlayButton({ c, className = '', children }: PartProps) {
  return <button type="button" onClick={c.toggle} className={className} aria-label={c.isPlaying ? 'Pause' : 'Play'} data-spider-sense>{children ?? (c.isPlaying ? '⏸' : '▶')}</button>
}

export function NextButton({ c, className = '', children }: PartProps) {
  return <button type="button" onClick={c.next} className={className} aria-label="Next track" data-spider-sense>{children ?? '⏭'}</button>
}

export function RepeatButton({ c, className = '', children }: PartProps) {
  return <button type="button" onClick={c.cycleRepeat} className={`${className} ${c.repeat !== 'off' ? 'is-active' : ''}`.trim()} aria-label={`Repeat: ${c.repeat}`} data-spider-sense>{children ?? c.repeatGlyph}</button>
}

export function VolumeRange({ c, className = 'mixtape-volume' }: PartProps) {
  return (
    <label className={className}><span>VOL</span>
      <input type="range" min={0} max={1} step={0.01} value={c.volume} onChange={(e) => c.setVolume(parseFloat(e.target.value))} aria-label="Volume" />
    </label>
  )
}

export function ListButton({ c, className = '', children }: PartProps) {
  return <button type="button" onClick={c.toggleList} className={`${className} ${c.listOpen ? 'is-active' : ''}`.trim()} aria-label="Toggle tracklist" aria-expanded={c.listOpen} data-spider-sense>{children ?? '≡'}</button>
}

export function HideButton({ c, className = '', children }: PartProps) {
  return <button type="button" onClick={c.toggleHidden} className={className} aria-label="Hide player (H)" title="Hide (H)" data-spider-sense>{children ?? '⌄'}</button>
}
