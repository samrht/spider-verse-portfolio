import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMixtapeStore } from '../store/mixtapeStore'
import { useUniverseStore } from '../store/universeStore'
import { VisualizerCanvas } from '../visualizer/VisualizerCanvas'
import { useSignal } from '../visualizer/useSignal'
import { Deck } from '../visualizer/ui/Deck'
import { ModeBadge } from '../visualizer/ui/ModeBadge'
import { SpotifyChip } from '../visualizer/ui/SpotifyChip'
import { useSpotifyStore } from '../visualizer/signal/spotifyPoll'
import '../styles/mixtape.css'
import '../styles/visualizer.css'

// /mixtape: the Halftone Field visualizer with the cassette deck over it.
// Sets data-universe="earth-1610" on <html> for Miles' palette and restores
// the previous universe on unmount.
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

  useEffect(() => {
    // Keep the store's activeUniverse (which the halftone dots follow) in
    // step with the page's forced earth-1610 palette, not just the DOM
    // attribute — setUniverse updates both.
    const prev = useUniverseStore.getState().activeUniverse
    useUniverseStore.getState().setUniverse('earth-1610')
    return () => {
      useUniverseStore.getState().setUniverse(prev)
    }
  }, [])

  return (
    <main className={`viz-page ${deckHidden ? 'is-deck-hidden' : ''}`} data-universe="earth-1610">
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
        <VisualizerCanvas signal={signal} trackKey={trackKey} debug={debug} onFallback={onFallback} />
      )}
      <Link to="/" className="mixtape-page-back viz-back">← BACK TO MOTHERSHIP</Link>
      <div className="viz-topright">
        <SpotifyChip />
        {!fallback && <ModeBadge kind={kind} />}
      </div>
      <Deck />
    </main>
  )
}
