import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildNowPlaying, getAccessToken, type NowPlaying, type SpotifyEnv } from './_spotify'

// Public "what the owner is listening to" feed. Tokens never leave the
// function; the CDN absorbs visitor polling via s-maxage.

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, s-maxage=3, stale-while-revalidate=10')
  res.setHeader('Content-Type', 'application/json')

  const env = process.env as Partial<SpotifyEnv>
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) {
    res.status(200).json({ error: 'unavailable' } satisfies NowPlaying)
    return
  }

  try {
    const token = await getAccessToken(env as SpotifyEnv, fetch, Date.now())
    const auth = { headers: { Authorization: `Bearer ${token}` } }
    const curRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', auth)
    let current: unknown = null
    if (curRes.status === 200) current = await curRes.json()
    else if (curRes.status !== 204) throw new Error(`currently-playing ${curRes.status}`)

    let recent: unknown = null
    const playing = (current as { is_playing?: boolean } | null)?.is_playing
    if (!playing) {
      const recRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', auth)
      if (recRes.ok) recent = await recRes.json()
    }
    res.status(200).json(buildNowPlaying(current, recent, Date.now()))
  } catch (err) {
    console.error('now-playing failed:', err)
    res.status(200).json({ error: 'unavailable' } satisfies NowPlaying)
  }
}
