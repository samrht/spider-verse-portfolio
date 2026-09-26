import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMixtapeStore } from '../store/mixtapeStore'
import { useUniverseStore } from '../store/universeStore'
import { VisualizerCanvas } from '../visualizer/VisualizerCanvas'
import { useSignal } from '../visualizer/useSignal'
import { Deck } from '../visualizer/ui/Deck'
import { ModeBadge } from '../visualizer/ui/ModeBadge'
import { SpotifyChip } from '../visualizer/ui/SpotifyChip'
import { useSpotifyStore } from '../visualizer/signal/spotifyPoll'
import { useBeatVar } from '../visualizer/ui/useBeatVar'
import { PageIndex } from '../comic/PageIndex'
import { useFullscreen } from '../visualizer/ui/useFullscreen'
import { useClipRecorder } from '../visualizer/capture/useClipRecorder'
import { FullscreenButton, ClipButton, MicButton } from '../visualizer/ui/ViewerControls'
import { useMicMode } from '../visualizer/ui/useMicMode'
import '../styles/mixtape.css'
import '../styles/visualizer.css'
import '../styles/mixtape-universe.css'

// /mixtape: the Halftone Field visualizer with the cassette deck over it.
// Follows the active universe (spec §3.1); the page index switches it.
export function Mixtape() {
  const spotifyStatus = useSpotifyStore((s) => s.status)
  const spotifySlug = useSpotifyStore((s) => s.slug)
  const positionMs = useSpotifyStore((s) => s.positionMs)
  useEffect(() => useSpotifyStore.getState().start(), [])
  const spotify = useMemo(
    () => ({ playing: spotifyStatus === 'playing', slug: spotifySlug, position: () => positionMs() / 1000 }),
    [spotifyStatus, spotifySlug, positionMs],
  )
  const mic = useMicMode()
  const { signal, trackKey, kind } = useSignal({ spotify, mic: { on: mic.on, onResult: mic.report } })
  const deckHidden = useMixtapeStore((s) => s.deckHidden)
  const debug = new URLSearchParams(window.location.search).has('debug')
  const [fallback, setFallback] = useState(false)
  const onFallback = useCallback(() => setFallback(true), [])

  const universe = useUniverseStore((s) => s.activeUniverse)
  const setUniverse = useUniverseStore((s) => s.setUniverse)
  const pageRef = useRef<HTMLElement>(null)
  useBeatVar(pageRef, signal)
  const [noSplit, setNoSplit] = useState(false)
  const onDegrade = useCallback(() => setNoSplit(true), [])
  const fs = useFullscreen(pageRef)
  const clip = useClipRecorder()
  const clipOn = clip.supported && !fallback

  // F toggles fullscreen, C starts/stops a clip (silent while the room mic listens),
  // M toggles the room mic (all ignored while typing or with modifiers).
  const keys = useRef({ fs, clip, clipOn, mic, kind })
  useEffect(() => { keys.current = { fs, clip, clipOn, mic, kind } })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      const k = keys.current
      if ((e.key === 'f' || e.key === 'F') && k.fs.supported) void k.fs.toggle()
      if ((e.key === 'c' || e.key === 'C') && k.clipOn) { if (k.clip.recording) k.clip.stop(); else k.clip.start({ withAudio: k.kind !== 'mic' }) }
      if ((e.key === 'm' || e.key === 'M') && k.mic.supported) k.mic.toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <main ref={pageRef} className={`viz-page ${deckHidden ? 'is-deck-hidden' : ''} ${noSplit ? 'no-split' : ''}`} data-universe={universe}>
      {fallback ? (
        <div className="viz-fallback" data-testid="viz-fallback" aria-hidden="true">
          <div className="mixtape-cover">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3 L13.6 8 L18 6.2 L15.6 10.4 L20 11.5 L15.6 13.6 L18 17.8 L13.6 16 L12 21 L10.4 16 L6 17.8 L8.4 13.6 L4 11.5 L8.4 10.4 L6 6.2 L10.4 8 Z" />
              <circle cx="12" cy="11.5" r="1.8" />
            </svg>
          </div>
        </div>
      ) : (
        <VisualizerCanvas signal={signal} trackKey={trackKey} debug={debug} onFallback={onFallback} onDegrade={onDegrade} capture={clip.sink} />
      )}
      <Link to={`/#u-${universe}`} className="viz-back">← BACK<span className="viz-back-long"> TO THE COMIC</span></Link>
      <div className="viz-topright">
        <SpotifyChip />
        {!fallback && <ModeBadge kind={kind} />}
        {mic.supported && !fallback && <MicButton state={mic.state} onToggle={mic.toggle} />}
        {clipOn && <ClipButton recording={clip.recording} secondsLeft={clip.secondsLeft} onStart={() => clip.start({ withAudio: kind !== 'mic' })} onStop={clip.stop} />}
        {fs.supported && <FullscreenButton active={fs.active} onToggle={() => void fs.toggle()} />}
      </div>
      <div className="viz-flash" aria-hidden="true" />
      <PageIndex onSelect={setUniverse} />
      <Deck />
    </main>
  )
}
