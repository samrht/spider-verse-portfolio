import { useEffect, useState } from 'react'
import { useSpotifyStore } from '../signal/spotifyPoll'
import { useMixtapeStore } from '../../store/mixtapeStore'

// Top-right chip: the owner's Spotify now-playing (public feed). Offers
// "▶ listen along" when the track is one of the mixtape songs.

export function SpotifyChip() {
  const status = useSpotifyStore((s) => s.status)
  const now = useSpotifyStore((s) => s.now)
  const slug = useSpotifyStore((s) => s.slug)
  const positionMs = useSpotifyStore((s) => s.positionMs)
  const playTrackAt = useMixtapeStore((s) => s.playTrackAt)
  const [offlineShown, setOfflineShown] = useState(status === 'offline')

  // Track the previous status during render (not in an effect) so entering
  // 'offline' shows the chip immediately, on the same render as the status
  // flip — react-hooks/set-state-in-effect forbids calling setState
  // synchronously from an effect body, so the "show" transition happens
  // here instead of inside the effect below, which only owns the timer.
  const [prevStatus, setPrevStatus] = useState(status)
  if (status !== prevStatus) {
    setPrevStatus(status)
    if (status === 'offline') setOfflineShown(true)
  }

  // spec §7: SPOTIFY OFFLINE for 10 s, then hide.
  useEffect(() => {
    if (status !== 'offline') return
    const id = window.setTimeout(() => setOfflineShown(false), 10_000)
    return () => window.clearTimeout(id)
  }, [status])

  if (status === 'unknown') return null
  if (status === 'offline') return offlineShown ? <span className="viz-chip is-offline">SPOTIFY OFFLINE</span> : null
  if (!now) return null

  return (
    <div className={`viz-chip ${status === 'playing' ? 'is-playing' : 'is-idle'}`}>
      {now.art && <img className="viz-chip-art" src={now.art} alt="" width={28} height={28} />}
      <div className="viz-chip-text">
        <span className="viz-chip-label">{status === 'playing' ? '● SMARTH IS LISTENING' : 'LAST PLAYED'}</span>
        <span className="viz-chip-track">{now.track}</span>
        <span className="viz-chip-artist">{now.artist}</span>
      </div>
      {status === 'playing' && slug && (
        <button
          type="button"
          className="viz-chip-listen"
          onClick={() => playTrackAt(slug, positionMs() / 1000)}
          data-spider-sense
        >
          ▶ listen along
        </button>
      )}
    </div>
  )
}
