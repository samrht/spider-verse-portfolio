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
  const { signal, trackKey, kind } = useSignal({ spotify })
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
        <VisualizerCanvas signal={signal} trackKey={trackKey} debug={debug} onFallback={onFallback} onDegrade={onDegrade} />
      )}
      <Link to={`/#u-${universe}`} className="viz-back">← BACK<span className="viz-back-long"> TO THE COMIC</span></Link>
      <div className="viz-topright">
        <SpotifyChip />
        {!fallback && <ModeBadge kind={kind} />}
      </div>
      <div className="viz-flash" aria-hidden="true" />
      <PageIndex onSelect={setUniverse} />
      <Deck />
    </main>
  )
}
