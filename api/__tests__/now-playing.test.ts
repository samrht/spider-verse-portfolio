import { describe, it, expect, vi } from 'vitest'
import { buildNowPlaying, getAccessToken, _resetTokenCache } from '../_spotify'

const item = {
  id: 'abc123', name: 'Sunflower', duration_ms: 158000,
  artists: [{ name: 'Post Malone' }, { name: 'Swae Lee' }],
  album: { name: 'Into the Spider-Verse', images: [{ url: 'https://i/large.jpg', width: 640 }, { url: 'https://i/small.jpg', width: 64 }] },
}

describe('buildNowPlaying', () => {
  it('maps a playing response', () => {
    const r = buildNowPlaying({ is_playing: true, progress_ms: 42000, item }, null, 1000)
    expect(r).toEqual({
      isPlaying: true, spotifyId: 'abc123', track: 'Sunflower', artist: 'Post Malone, Swae Lee',
      album: 'Into the Spider-Verse', art: 'https://i/large.jpg', progressMs: 42000, durationMs: 158000, fetchedAt: 1000,
    })
  })
  it('falls back to recently played when nothing is playing', () => {
    const r = buildNowPlaying(null, { items: [{ track: item }] }, 5)
    expect(r).toEqual({
      isPlaying: false, fetchedAt: 5,
      lastPlayed: { spotifyId: 'abc123', track: 'Sunflower', artist: 'Post Malone, Swae Lee', album: 'Into the Spider-Verse', art: 'https://i/large.jpg', durationMs: 158000 },
    })
  })
  it('treats a paused player as not playing', () => {
    const r = buildNowPlaying({ is_playing: false, progress_ms: 1, item }, null, 5)
    expect(r.isPlaying).toBe(false)
  })
  it('handles no history', () => {
    expect(buildNowPlaying(null, { items: [] }, 5)).toEqual({ isPlaying: false, lastPlayed: null, fetchedAt: 5 })
  })
})

describe('getAccessToken', () => {
  const env = { SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret', SPOTIFY_REFRESH_TOKEN: 'rt' }
  it('exchanges the refresh token and caches until near expiry', async () => {
    _resetTokenCache()
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ access_token: 'AT', expires_in: 3600 }), { status: 200 }))
    expect(await getAccessToken(env, fetchFn as unknown as typeof fetch, 0)).toBe('AT')
    expect(await getAccessToken(env, fetchFn as unknown as typeof fetch, 1000 * 3000)).toBe('AT')
    expect(fetchFn).toHaveBeenCalledTimes(1)
    await getAccessToken(env, fetchFn as unknown as typeof fetch, 1000 * 3560)
    expect(fetchFn).toHaveBeenCalledTimes(2)
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://accounts.spotify.com/api/token')
    expect((init.headers as Record<string, string>).Authorization).toBe('Basic ' + Buffer.from('id:secret').toString('base64'))
  })
  it('trims pasted values and drops a stray KEY= prefix', async () => {
    _resetTokenCache()
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 }))
    const messy = { SPOTIFY_CLIENT_ID: ' id\n', SPOTIFY_CLIENT_SECRET: 'secret ', SPOTIFY_REFRESH_TOKEN: 'SPOTIFY_REFRESH_TOKEN=rt\r\n' }
    await getAccessToken(messy, fetchFn as unknown as typeof fetch, 0)
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Basic ' + Buffer.from('id:secret').toString('base64'))
    expect(String(init.body)).toContain('refresh_token=rt')
    expect(String(init.body)).not.toContain('SPOTIFY_REFRESH_TOKEN')
  })
  it('throws on a non-200', async () => {
    _resetTokenCache()
    const fetchFn = vi.fn(async () => new Response('nope', { status: 400 }))
    await expect(getAccessToken(env, fetchFn as unknown as typeof fetch, 0)).rejects.toThrow()
  })
})
