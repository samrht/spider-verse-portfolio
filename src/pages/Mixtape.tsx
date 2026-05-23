import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMixtapeStore } from '../store/mixtapeStore'
import { MIXTAPE_TRACKS, MOVIE_LABEL } from '../data/mixtape'
import '../styles/mixtape.css'

// Full /mixtape page. Sets data-universe="earth-1610" on <html> so the page
// inherits Miles' Brooklyn palette (the album's centre of gravity), then
// restores whatever universe the visitor came from on unmount.
export function Mixtape() {
  const currentIndex = useMixtapeStore((s) => s.currentIndex)
  const isPlaying = useMixtapeStore((s) => s.isPlaying)
  const progress = useMixtapeStore((s) => s.progress)
  const duration = useMixtapeStore((s) => s.duration)
  const shuffle = useMixtapeStore((s) => s.shuffle)
  const repeat = useMixtapeStore((s) => s.repeat)
  const volume = useMixtapeStore((s) => s.volume)
  const toggle = useMixtapeStore((s) => s.toggle)
  const next = useMixtapeStore((s) => s.next)
  const prev = useMixtapeStore((s) => s.prev)
  const select = useMixtapeStore((s) => s.select)
  const toggleShuffle = useMixtapeStore((s) => s.toggleShuffle)
  const cycleRepeat = useMixtapeStore((s) => s.cycleRepeat)
  const setVolume = useMixtapeStore((s) => s.setVolume)
  const seek = useMixtapeStore((s) => s.seek)

  useEffect(() => {
    const root = document.documentElement
    const prev = root.getAttribute('data-universe')
    root.setAttribute('data-universe', 'earth-1610')
    return () => {
      if (prev) root.setAttribute('data-universe', prev)
      else root.removeAttribute('data-universe')
    }
  }, [])

  const track = MIXTAPE_TRACKS[currentIndex]
  const pct = duration > 0 ? (progress / duration) * 100 : 0
  const repeatGlyph = repeat === 'one' ? '↻¹' : repeat === 'all' ? '↻' : '⤿'

  return (
    <main className="mixtape-page" data-universe="earth-1610">
      <Link to="/" className="mixtape-page-back">← BACK TO MOTHERSHIP</Link>

      <header className="mixtape-page-header">
        <p className="meta">◇ Spider-Verse Mixtape · Side A + Side B ◇</p>
        <h1>THE MIXTAPE</h1>
        <p className="tagline">
          Nine tracks from <em>Into</em> and <em>Across the Spider-Verse</em>.
          Press play — leave it on while you browse.
        </p>
      </header>

      <div className="mixtape-page-grid">
        <section className="mixtape-now-card" aria-label="Now playing">
          <div className="mixtape-cover" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3 L13.6 8 L18 6.2 L15.6 10.4 L20 11.5 L15.6 13.6 L18 17.8 L13.6 16 L12 21 L10.4 16 L6 17.8 L8.4 13.6 L4 11.5 L8.4 10.4 L6 6.2 L10.4 8 Z" />
              <circle cx="12" cy="11.5" r="1.8" />
            </svg>
          </div>

          <p className="mixtape-now-movie">{MOVIE_LABEL[track.movie]}</p>
          <h2 className="mixtape-now-title">{track.title}</h2>
          <p className="mixtape-now-artist">{track.artist}</p>

          <div className="mixtape-now-scrub">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={progress}
              onChange={(e) => seek(parseFloat(e.target.value))}
              aria-label="Track progress"
              style={{ '--mixtape-pct': `${pct}%` } as React.CSSProperties}
            />
            <div className="mixtape-now-time">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="mixtape-now-controls">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`mixtape-control-btn ${shuffle ? 'is-active' : ''}`}
              aria-label="Toggle shuffle"
              aria-pressed={shuffle}
              title="Shuffle"
              data-spider-sense
            >
              ⇌
            </button>
            <button
              type="button"
              onClick={prev}
              className="mixtape-control-btn"
              aria-label="Previous track"
              data-spider-sense
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={toggle}
              className="mixtape-control-play"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              data-spider-sense
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              type="button"
              onClick={next}
              className="mixtape-control-btn"
              aria-label="Next track"
              data-spider-sense
            >
              ⏭
            </button>
            <button
              type="button"
              onClick={cycleRepeat}
              className={`mixtape-control-btn ${repeat !== 'off' ? 'is-active' : ''}`}
              aria-label={`Repeat: ${repeat}`}
              title={`Repeat: ${repeat}`}
              data-spider-sense
            >
              {repeatGlyph}
            </button>
          </div>

          <label className="mixtape-volume">
            <span>VOL</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Volume"
              style={{ '--mixtape-vol': Math.round(volume * 100) } as React.CSSProperties}
            />
          </label>
        </section>

        <section aria-label="Tracklist">
          <ol className="mixtape-tracklist">
            {MIXTAPE_TRACKS.map((t, i) => {
              const active = i === currentIndex
              return (
                <li key={t.slug}>
                  <button
                    type="button"
                    className="mixtape-track-row"
                    onClick={() => select(i)}
                    aria-current={active}
                    data-spider-sense
                  >
                    <span className="mixtape-track-index">
                      {active && isPlaying ? '♪' : (i + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="mixtape-track-text">
                      <span className="mixtape-track-title">{t.title}</span>
                      <span className="mixtape-track-artist">{t.artist}</span>
                    </span>
                    <span className="mixtape-track-tag" data-movie={t.movie}>
                      {t.movie === 'into' ? 'INTO' : 'ACROSS'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          <p className="mixtape-credits">
            All tracks © Sony Pictures Entertainment / respective artists.
            Personal portfolio — not affiliated with Sony, Marvel, or any
            artist listed. Files served for browsing only; if you're a rights
            holder and want a track removed, reach out via the contact details
            on the home page.
          </p>
        </section>
      </div>
    </main>
  )
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
