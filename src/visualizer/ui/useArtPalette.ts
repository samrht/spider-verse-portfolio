import { useEffect, useMemo, useState } from 'react'
import { useSpotifyStore } from '../signal/spotifyPoll'
import { useMixtapeStore } from '../../store/mixtapeStore'
import { useUniverseStore } from '../../store/universeStore'
import { artPalette, fitToBackdrop, type Palette3 } from '../signal/artPalette'

// Album-art colours (listen-modes spec §4.1): only while the owner's Spotify
// is playing, nothing local plays and the mic is off. The loaded palette is
// keyed by URL, so a stale load can never apply to a newer cover.
export function useArtPalette(opts: { micOn: boolean; load?: (url: string) => Promise<Palette3 | null> }): Palette3 | null {
  const status = useSpotifyStore((s) => s.status)
  const art = useSpotifyStore((s) => s.now?.art ?? null)
  const localPlaying = useMixtapeStore((s) => s.isPlaying)
  const universe = useUniverseStore((s) => s.activeUniverse)
  const active = status === 'playing' && !localPlaying && !opts.micOn && !!art
  const load = opts.load ?? artPalette
  const [loaded, setLoaded] = useState<{ url: string; colors: Palette3 | null } | null>(null)

  useEffect(() => {
    if (!active || !art) return
    let cancelled = false
    load(art).then((colors) => { if (!cancelled) setLoaded({ url: art, colors }) }, () => {})
    return () => { cancelled = true }
  }, [active, art, load])

  return useMemo(() => {
    if (!active || !loaded || loaded.url !== art || !loaded.colors) return null
    return fitToBackdrop(loaded.colors, universe)
  }, [active, loaded, art, universe])
}
