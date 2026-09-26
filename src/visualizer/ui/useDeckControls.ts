import { useState } from 'react'
import { useMixtapeStore } from '../../store/mixtapeStore'
import { MIXTAPE_TRACKS, MOVIE_LABEL, type MixtapeTrack } from '../../data/mixtape'
import { useDeckHide } from './useDeckHide'

// All deck behaviour in one place (spec §3.2). Faces are presentational and
// receive this object; they never touch the store themselves.

export type RepeatMode = 'off' | 'all' | 'one'

export interface DeckControls {
  track: MixtapeTrack
  movieLabel: string
  isPlaying: boolean
  progress: number
  duration: number
  pct: number
  shuffle: boolean
  repeat: RepeatMode
  repeatGlyph: string
  volume: number
  listOpen: boolean
  hidden: boolean
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (s: number) => void
  setVolume: (v: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  toggleList: () => void
  toggleHidden: () => void
  show: () => void
}

export function useDeckControls(): DeckControls {
  const currentIndex = useMixtapeStore((s) => s.currentIndex)
  const isPlaying = useMixtapeStore((s) => s.isPlaying)
  const progress = useMixtapeStore((s) => s.progress)
  const duration = useMixtapeStore((s) => s.duration)
  const shuffle = useMixtapeStore((s) => s.shuffle)
  const repeat = useMixtapeStore((s) => s.repeat)
  const volume = useMixtapeStore((s) => s.volume)
  const toggle = useMixtapeStore((s) => s.toggle)
  const next = useMixtapeStore((s) => s.next)
  const prev = useMixtapeStore((s) => s.prev)
  const seek = useMixtapeStore((s) => s.seek)
  const setVolume = useMixtapeStore((s) => s.setVolume)
  const toggleShuffle = useMixtapeStore((s) => s.toggleShuffle)
  const cycleRepeat = useMixtapeStore((s) => s.cycleRepeat)
  const { hidden, toggle: toggleHidden, show } = useDeckHide()
  const [listOpen, setListOpen] = useState(false)

  const track = MIXTAPE_TRACKS[currentIndex]
  return {
    track,
    movieLabel: MOVIE_LABEL[track.movie],
    isPlaying,
    progress,
    duration,
    pct: duration > 0 ? (progress / duration) * 100 : 0,
    shuffle,
    repeat,
    repeatGlyph: repeatGlyphFor(repeat),
    volume,
    listOpen,
    hidden,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    toggleList: () => setListOpen((o) => !o),
    toggleHidden,
    show,
  }
}

export function repeatGlyphFor(r: RepeatMode): string {
  return r === 'one' ? '↻¹' : r === 'all' ? '↻' : '⤿'
}

export function fmt(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
