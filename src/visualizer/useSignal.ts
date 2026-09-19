import { useEffect, useMemo, useRef, useState } from 'react'
import { useMixtapeStore } from '../store/mixtapeStore'
import { getMediaElement } from '../engine/mixtapeEngine'
import { MIXTAPE_TRACKS } from '../data/mixtape'
import { createSignal, type SignalProvider } from './signal/types'
import { Procedural } from './signal/Procedural'
import { LiveFFT } from './signal/LiveFFT'
import { selectProvider, type ProviderKind } from './signal/select'
import { hasBeatMap, loadBeatMap, BeatMap } from './signal/BeatMap'

// Owns the active SignalProvider for the page and samples it once per
// animation frame into a single mutable AudioSignal (the canvas reads the
// same object — no React state on the hot path). Beat-map and Spotify
// inputs arrive in Tasks 9 and 11; until then they are constant `null`.

export interface SignalInputs {
  beatMapFor?: (slug: string) => boolean          // T9
  makeBeatMap?: (slug: string, position: () => number) => SignalProvider | null // T9
  spotify?: { playing: boolean; slug: string | null; position: () => number } | null // T11
}

export function useSignal(inputs: SignalInputs = {}) {
  const signal = useMemo(() => createSignal('procedural'), [])
  const isPlaying = useMixtapeStore((s) => s.isPlaying)
  const currentIndex = useMixtapeStore((s) => s.currentIndex)
  const progress = useMixtapeStore((s) => s.progress)
  const slug = MIXTAPE_TRACKS[currentIndex].slug
  const progressRef = useRef(progress)
  useEffect(() => { progressRef.current = progress })

  const beatMapFor = inputs.beatMapFor ?? hasBeatMap
  const makeBeatMap = inputs.makeBeatMap ?? null
  const spotify = inputs.spotify ?? null
  const kind: ProviderKind = selectProvider({
    localPlaying: isPlaying,
    analyserAvailable: LiveFFT.available() && getMediaElement() !== null,
    localHasBeatMap: beatMapFor(slug),
    spotifyPlaying: !!spotify?.playing,
    spotifyHasBeatMap: !!(spotify?.slug && beatMapFor(spotify.slug)),
  })

  // Lazily stamped in an effect rather than a useRef initializer: reading
  // performance.now() during render is an impure call under react-hooks/purity.
  const t0 = useRef(0)
  useEffect(() => { t0.current = performance.now() }, [])
  const nowSeconds = useMemo(() => {
    if (kind === 'live' || (kind === 'beatmap' && isPlaying)) return () => progressRef.current
    if (kind === 'beatmap' && spotify) return spotify.position
    return () => (performance.now() - t0.current) / 1000
  }, [kind, isPlaying, spotify])

  const [provider, setProvider] = useState<SignalProvider | null>(null)
  useEffect(() => {
    let cancelled = false
    let active: SignalProvider | null = null

    // Single load path for every provider kind: resolve the right
    // provider (awaiting a beat-map fetch when there's no injected
    // `makeBeatMap`), start it, and only publish it if this effect run
    // hasn't since been cancelled (deps changed or the component unmounted).
    async function pick(): Promise<SignalProvider> {
      if (kind === 'live') {
        const el = getMediaElement()
        if (el) return new LiveFFT(el)
      } else if (kind === 'beatmap') {
        const s = isPlaying ? slug : spotify?.slug ?? slug
        // When `makeBeatMap` is supplied, its return value is final: a
        // `null` means "no map for this track", not "fall through to the
        // network fetch". Only the absence of the hook itself falls
        // through to `loadBeatMap`.
        if (makeBeatMap) return makeBeatMap(s, nowSeconds) ?? new Procedural()
        const m = await loadBeatMap(s)
        if (m) return new BeatMap(m, nowSeconds)
      }
      return new Procedural({ idle: kind === 'idle' })
    }

    pick().then(async (p) => {
      await p.start()
      if (cancelled) { p.stop(); return }
      active = p
      setProvider(p)
    })

    return () => { cancelled = true; active?.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nowSeconds/makeBeatMap change only alongside kind/isPlaying/spotify?.slug here
  }, [kind, slug, isPlaying, spotify?.slug])

  useEffect(() => {
    if (!provider) return
    let raf = 0
    const loop = () => { provider.sample(signal, nowSeconds()); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [provider, signal, nowSeconds])

  const trackKey = kind === 'live' || (kind === 'beatmap' && isPlaying) ? slug : spotify?.slug ?? 'procedural'
  return { signal, nowSeconds, trackKey, kind }
}
