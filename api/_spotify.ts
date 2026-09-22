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

// Dashboard pastes often carry whitespace or the "KEY=" prefix from the auth
// script's output; either one makes Spotify reject the refresh with a 400.
function clean(value: string, key: string): string {
  const v = value.trim()
  return v.startsWith(`${key}=`) ? v.slice(key.length + 1).trim() : v
}

let tokenCache: { token: string; expiresAt: number } | null = null
export function _resetTokenCache(): void { tokenCache = null }

// Refresh-token grant, cached in module scope until 60 s before expiry.
export async function getAccessToken(env: SpotifyEnv, fetchFn: typeof fetch, now: number): Promise<string> {
  if (tokenCache && now < tokenCache.expiresAt - 60_000) return tokenCache.token
  const id = clean(env.SPOTIFY_CLIENT_ID, 'SPOTIFY_CLIENT_ID')
  const secret = clean(env.SPOTIFY_CLIENT_SECRET, 'SPOTIFY_CLIENT_SECRET')
  const refresh = clean(env.SPOTIFY_REFRESH_TOKEN, 'SPOTIFY_REFRESH_TOKEN')
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh })
  const res = await fetchFn('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) {
    // Spotify's error code is safe to log and says which value is wrong:
    // invalid_grant = refresh token, invalid_client = client id/secret.
    const detail = await res.text().then((t) => {
      try { const j = JSON.parse(t) as { error?: string; error_description?: string }; return [j.error, j.error_description].filter(Boolean).join(': ') } catch { return '' }
    }, () => '')
    throw new Error(`token refresh failed: ${res.status}${detail ? ` (${detail})` : ''}`)
  }
  const json = (await res.json()) as { access_token: string; expires_in: number }
  tokenCache = { token: json.access_token, expiresAt: now + json.expires_in * 1000 }
  return json.access_token
}
