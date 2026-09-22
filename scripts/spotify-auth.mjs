#!/usr/bin/env node
// One-time: obtain a refresh token for the owner's account.
//
//   1. https://developer.spotify.com/dashboard → create app → add redirect
//      URI exactly: http://127.0.0.1:8888/callback (Spotify rejects "localhost";
//      loopback redirects must be http + an explicit 127.0.0.1)
//   2. SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node scripts/spotify-auth.mjs
//   3. Open the printed URL, approve, and paste the printed refresh token into
//      Vercel: printf '%s' '<token>' | npx vercel env add SPOTIFY_REFRESH_TOKEN production
//      (use bash printf, not PowerShell piping — PowerShell prepends a BOM).

import { createServer } from 'node:http'

const id = process.env.SPOTIFY_CLIENT_ID
const secret = process.env.SPOTIFY_CLIENT_SECRET
if (!id || !secret) { console.error('set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET'); process.exit(1) }

const redirect = 'http://127.0.0.1:8888/callback'
const scope = 'user-read-currently-playing user-read-recently-played'
const url = new URL('https://accounts.spotify.com/authorize')
url.search = new URLSearchParams({ client_id: id, response_type: 'code', redirect_uri: redirect, scope }).toString()

console.log('\nOpen this URL and approve:\n\n' + url.toString() + '\n')

createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1:8888')
  if (u.pathname !== '/callback') { res.statusCode = 404; res.end(); return }
  const code = u.searchParams.get('code')
  if (!code) { res.end('missing code'); return }
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect }),
  })
  const json = await tokenRes.json()
  if (!json.refresh_token) { res.end('failed: ' + JSON.stringify(json)); console.error(json); process.exit(1) }
  res.end('Done — go back to the terminal.')
  console.log('\nSPOTIFY_REFRESH_TOKEN=' + json.refresh_token + '\n')
  process.exit(0)
}).listen(8888, '127.0.0.1', () => console.log('listening on ' + redirect))
