import { create } from 'zustand'
import { MIXTAPE_TRACKS } from '../../data/mixtape'

// Polls /api/now-playing every 3 s while /mixtape is mounted (paused while
// the tab is hidden) and interpolates the owner's playback position between
// polls. Mirrors api/_spotify.ts NowPlaying — api/ is not importable here.

export interface NowPlayingClient {
  spotifyId: string
  track: string
  artist: string
  album: string
  art: string | null
  durationMs: number
  progressMs?: number
}

export type SpotifyStatus = 'unknown' | 'playing' | 'idle' | 'offline'

interface SpotifyState {
  status: SpotifyStatus
  now: NowPlayingClient | null
  lastFetchedAt: number
  slug: string | null
  positionMs: () => number
  start: () => () => void
}

export const POLL_MS = 3000

export function interpolate(progressMs: number, fetchedAt: number, now: number): number {
  return Math.max(0, progressMs + Math.max(0, now - fetchedAt))
}

export function slugForSpotifyId(id: string): string | null {
  return MIXTAPE_TRACKS.find((t) => t.spotifyId === id)?.slug ?? null
}

export const useSpotifyStore = create<SpotifyState>()((set, get) => ({
  status: 'unknown',
  now: null,
  lastFetchedAt: 0,
  slug: null,

  positionMs: () => {
    const { now, lastFetchedAt, status } = get()
    if (status !== 'playing' || !now) return 0
    return interpolate(now.progressMs ?? 0, lastFetchedAt, Date.now())
  },

  start: () => {
    let timer: number | null = null
    let stopped = false

    const tick = async () => {
      if (stopped) return
      if (typeof document !== 'undefined' && document.hidden) { schedule(); return }
      try {
        const r = await fetch('/api/now-playing')
        const j = (await r.json()) as
          | { error: string }
          | ({ isPlaying: true; fetchedAt: number } & NowPlayingClient)
          | { isPlaying: false; lastPlayed: NowPlayingClient | null; fetchedAt: number }
        if ('error' in j) { set({ status: 'offline' }); schedule(); return }
        // Use our own clock as fetchedAt: the server's clock may drift and
        // the interpolation only needs local elapsed time.
        const fetchedAt = Date.now()
        if (j.isPlaying) {
          const { isPlaying: _p, fetchedAt: _f, ...track } = j
          set({ status: 'playing', now: track, lastFetchedAt: fetchedAt, slug: slugForSpotifyId(track.spotifyId) })
        } else {
          set({ status: 'idle', now: j.lastPlayed, lastFetchedAt: fetchedAt, slug: null })
        }
      } catch {
        set({ status: 'offline' })
      }
      schedule()
    }
    const schedule = () => { if (!stopped) timer = window.setTimeout(tick, POLL_MS) }

    void tick()
    return () => { stopped = true; if (timer) window.clearTimeout(timer) }
  },
}))
