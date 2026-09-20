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
// same object — no React state on the hot path).

export interface SignalInputs {
  beatMapFor?: (slug: string) => boolean
  makeBeatMap?: (slug: string, position: () => number) => SignalProvider | null
  spotify?: { playing: boolean; slug: string | null; position: () => number } | null
}

// R13: the store's `progress` only changes on the 250 ms poll. While playing,
// add the wall-clock time since that value was stamped so BeatMap lookups
// (and anything else keyed on position) move every frame. Paused: the
// stamped value as-is.
export function interpolatePosition(progress: number, stampedAt: number, now: number, playing: boolean): number {
  return Math.max(0, progress + (playing ? Math.max(0, now - stampedAt) / 1000 : 0))
}

export function useSignal(inputs: SignalInputs = {}) {
  const signal = useMemo(() => createSignal('procedural'), [])
  const isPlaying = useMixtapeStore((s) => s.isPlaying)
  const currentIndex = useMixtapeStore((s) => s.currentIndex)
  const progress = useMixtapeStore((s) => s.progress)
  const slug = MIXTAPE_TRACKS[currentIndex].slug
  const progressRef = useRef(progress)
  const stampedAt = useRef(0)
  useEffect(() => {
    progressRef.current = progress
    // Re-stamp on play/pause too, so a resume doesn't add the paused
    // interval to the position for the 250 ms before the next poll.
    stampedAt.current = performance.now()
  }, [progress, isPlaying])

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
    if (kind === 'live' || (kind === 'beatmap' && isPlaying)) {
      return () => interpolatePosition(progressRef.current, stampedAt.current, performance.now(), isPlaying)
    }
    if (kind === 'beatmap' && spotify) return spotify.position
    return () => (performance.now() - t0.current) / 1000
  }, [kind, isPlaying, spotify])

  // R16: a provider whose start() rejects (typically LiveFFT on a suspended
  // AudioContext) falls through to the next tier; selection re-runs when the
  // context reports 'running' or on the next pointerdown.
  const [provider, setProvider] = useState<SignalProvider | null>(null)
  const [startFailed, setStartFailed] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    let active: SignalProvider | null = null
    // Synced-from-Spotify only when nothing plays locally; otherwise the
    // local deck's track, whatever the provider tier.
    const trackSlug = kind === 'beatmap' && !isPlaying ? spotify?.slug ?? slug : slug

    async function beatMapProvider(): Promise<SignalProvider | null> {
      // When `makeBeatMap` is supplied, its return value is final: a `null`
      // means "no map for this track", not "fall through to the network
      // fetch". Only the absence of the hook itself falls through to
      // `loadBeatMap`.
      if (makeBeatMap) return makeBeatMap(trackSlug, nowSeconds)
      const m = await loadBeatMap(trackSlug)
      return m ? new BeatMap(m, nowSeconds) : null
    }

    async function pick(): Promise<SignalProvider> {
      if (kind === 'live') {
        const el = getMediaElement()
        if (el) return new LiveFFT(el)
      } else if (kind === 'beatmap') {
        return (await beatMapProvider()) ?? new Procedural()
      }
      return new Procedural({ idle: kind === 'idle' })
    }

    // Next tier down from a failed pick(): live → beat map (if any) →
    // procedural; beat map → procedural. Procedural.start() never rejects.
    async function pickFallback(): Promise<SignalProvider> {
      if (kind === 'live' && beatMapFor(trackSlug)) {
        try {
          const p = await beatMapProvider()
          if (p) { await p.start(); return p }
        } catch { /* fall through */ }
      }
      const p = new Procedural({ idle: kind === 'idle' })
      await p.start()
      return p
    }

    async function run(): Promise<void> {
      let p: SignalProvider
      let failed = false
      try {
        p = await pick()
        await p.start()
      } catch {
        failed = true
        p = await pickFallback()
      }
      if (cancelled) { p.stop(); return }
      active = p
      setProvider(p)
      setStartFailed(failed)
    }

    void run()

    return () => { cancelled = true; active?.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nowSeconds/makeBeatMap/beatMapFor change only alongside kind/isPlaying/spotify?.slug here
  }, [kind, slug, isPlaying, spotify?.slug, retry])

  useEffect(() => {
    if (!startFailed) return
    const bump = () => setRetry((r) => r + 1)
    const unsubscribe = LiveFFT.onStateChange((state) => { if (state === 'running') bump() })
    window.addEventListener('pointerdown', bump, { once: true })
    return () => { unsubscribe(); window.removeEventListener('pointerdown', bump) }
    // `retry` re-arms the one-shot listener when a retry fails again.
  }, [startFailed, retry])

  useEffect(() => {
    if (!provider) return
    let raf = 0
    const loop = () => { provider.sample(signal, nowSeconds()); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [provider, signal, nowSeconds])

  // R14: only a real track change moves this key — the loaded local slug,
  // or the owner's Spotify slug while synced (nothing playing locally).
  // Pause/resume, provider tier and Spotify status flips leave it alone.
  const synced = kind === 'beatmap' && !isPlaying && spotify?.slug
  const trackKey = synced ? synced : slug
  return { signal, nowSeconds, trackKey, kind }
}
