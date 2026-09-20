// Pure helpers for the now-playing function. Underscore-prefixed files in
// api/ are not deployed as routes by Vercel.

export interface NowPlayingTrack {
  spotifyId: string
  track: string
  artist: string
  album: string
  art: string | null
  durationMs: number
}
export type NowPlaying =
  | (NowPlayingTrack & { isPlaying: true; progressMs: number; fetchedAt: number })
  | { isPlaying: false; lastPlayed: NowPlayingTrack | null; fetchedAt: number }
  | { error: 'unavailable' }

interface SpotifyItem {
  id: string
  name: string
  duration_ms: number
  artists: Array<{ name: string }>
  album: { name: string; images: Array<{ url: string; width: number }> }
}

function mapItem(item: SpotifyItem): NowPlayingTrack {
  const images = [...(item.album?.images ?? [])].sort((a, b) => b.width - a.width)
  return {
    spotifyId: item.id,
    track: item.name,
    artist: item.artists.map((a) => a.name).join(', '),
    album: item.album?.name ?? '',
    art: images[0]?.url ?? null,
    durationMs: item.duration_ms,
  }
}

export function buildNowPlaying(current: unknown, recent: unknown, now: number): NowPlaying {
  const cur = current as { is_playing?: boolean; progress_ms?: number; item?: SpotifyItem | null } | null
  if (cur?.is_playing && cur.item) {
    return { isPlaying: true, ...mapItem(cur.item), progressMs: cur.progress_ms ?? 0, fetchedAt: now }
  }
  const rec = recent as { items?: Array<{ track: SpotifyItem }> } | null
  const last = rec?.items?.[0]?.track
  return { isPlaying: false, lastPlayed: last ? mapItem(last) : null, fetchedAt: now }
}

export interface SpotifyEnv {
  SPOTIFY_CLIENT_ID: string
  SPOTIFY_CLIENT_SECRET: string
  SPOTIFY_REFRESH_TOKEN: string
}

let tokenCache: { token: string; expiresAt: number } | null = null
export function _resetTokenCache(): void { tokenCache = null }

// Refresh-token grant, cached in module scope until 60 s before expiry.
export async function getAccessToken(env: SpotifyEnv, fetchFn: typeof fetch, now: number): Promise<string> {
  if (tokenCache && now < tokenCache.expiresAt - 60_000) return tokenCache.token
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env.SPOTIFY_REFRESH_TOKEN })
  const res = await fetchFn('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) throw new Error(`token refresh failed: ${res.status}`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  tokenCache = { token: json.access_token, expiresAt: now + json.expires_in * 1000 }
  return json.access_token
}
