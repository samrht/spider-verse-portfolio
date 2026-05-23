import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMixtapeStore } from '../../store/mixtapeStore'
import { MIXTAPE_TRACKS } from '../../data/mixtape'
import '../../styles/mixtape.css'

// Persistent mini-player. Lives in the root layout so it survives route
// changes. Hidden on /mixtape (the full page has the same controls).
// Collapsed: small spider-emblem button with a pulse dot when playing.
// Expanded: card with track title, scrubber, transport, shuffle, deep-link.
export function MixtapeHUD() {
  const { pathname } = useLocation()
  const [expanded, setExpanded] = useState(false)

  const currentIndex = useMixtapeStore((s) => s.currentIndex)
  const isPlaying = useMixtapeStore((s) => s.isPlaying)
  const progress = useMixtapeStore((s) => s.progress)
  const duration = useMixtapeStore((s) => s.duration)
  const shuffle = useMixtapeStore((s) => s.shuffle)
  const toggle = useMixtapeStore((s) => s.toggle)
  const next = useMixtapeStore((s) => s.next)
  const prev = useMixtapeStore((s) => s.prev)
  const toggleShuffle = useMixtapeStore((s) => s.toggleShuffle)
  const seek = useMixtapeStore((s) => s.seek)

  if (pathname === '/mixtape') return null

  const track = MIXTAPE_TRACKS[currentIndex]
  const pct = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <aside
      className={`mixtape-hud ${expanded ? 'is-expanded' : 'is-collapsed'}`}
      aria-label="Spider-Verse mixtape player"
    >
      {!expanded && (
        <button
          type="button"
          className="mixtape-hud-toggle"
          onClick={() => setExpanded(true)}
          aria-label="Open mixtape player"
          data-spider-sense
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M12 3 L13.6 8 L18 6.2 L15.6 10.4 L20 11.5 L15.6 13.6 L18 17.8 L13.6 16 L12 21 L10.4 16 L6 17.8 L8.4 13.6 L4 11.5 L8.4 10.4 L6 6.2 L10.4 8 Z" />
          </svg>
          {isPlaying && <span className="mixtape-hud-pulse" aria-hidden="true" />}
          <span className="mixtape-hud-label">MIXTAPE</span>
        </button>
      )}

      {expanded && (
        <div className="mixtape-hud-card">
          <header className="mixtape-hud-card-header">
            <span className="mixtape-hud-eyebrow font-display">SPIDER-VERSE MIXTAPE</span>
            <button
              type="button"
              className="mixtape-hud-collapse"
              onClick={() => setExpanded(false)}
              aria-label="Collapse mixtape player"
            >
              −
            </button>
          </header>

          <div className="mixtape-hud-now">
            <p className="mixtape-hud-title">{track.title}</p>
            <p className="mixtape-hud-artist">{track.artist}</p>
          </div>

          <div className="mixtape-hud-scrubber">
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
            <div className="mixtape-hud-time">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="mixtape-hud-transport">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`mixtape-hud-icon-btn ${shuffle ? 'is-active' : ''}`}
              aria-label="Toggle shuffle"
              aria-pressed={shuffle}
              data-spider-sense
            >
              ⇌
            </button>
            <button
              type="button"
              onClick={prev}
              className="mixtape-hud-icon-btn"
              aria-label="Previous track"
              data-spider-sense
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={toggle}
              className="mixtape-hud-play"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              data-spider-sense
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              type="button"
              onClick={next}
              className="mixtape-hud-icon-btn"
              aria-label="Next track"
              data-spider-sense
            >
              ⏭
            </button>
            <Link
              to="/mixtape"
              className="mixtape-hud-icon-btn"
              aria-label="Open full mixtape page"
              onClick={() => setExpanded(false)}
              data-spider-sense
            >
              ↗
            </Link>
          </div>
        </div>
      )}
    </aside>
  )
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
