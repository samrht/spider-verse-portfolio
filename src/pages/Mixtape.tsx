import { useEffect, useMemo } from 'react'
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
  const { signal, nowSeconds, trackKey, kind } = useSignal({ spotify })
  const deckHidden = useMixtapeStore((s) => s.deckHidden)
  const debug = new URLSearchParams(window.location.search).has('debug')

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
      <VisualizerCanvas signal={signal} nowSeconds={nowSeconds} trackKey={trackKey} debug={debug} />
      <Link to="/" className="mixtape-page-back viz-back">← BACK TO MOTHERSHIP</Link>
      <div className="viz-topright">
        <SpotifyChip />
        <ModeBadge kind={kind} />
      </div>
      <Deck />
    </main>
  )
}
