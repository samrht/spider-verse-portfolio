import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useMixtapeStore } from '../../store/mixtapeStore'
import { MIXTAPE_TRACKS, MOVIE_LABEL } from '../../data/mixtape'
import { prefersReducedMotion } from '../../engine/motion'
import { useDeckHide } from './useDeckHide'
import { Tracklist } from './Tracklist'

// Cassette deck: the mixtape player's face on /mixtape. Reels spin while
// playing; ≡ slides the tracklist up; ⌄ hides the deck (see useDeckHide).

export function Deck() {
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
  const toggleShuffle = useMixtapeStore((s) => s.toggleShuffle)
  const cycleRepeat = useMixtapeStore((s) => s.cycleRepeat)
  const setVolume = useMixtapeStore((s) => s.setVolume)
  const seek = useMixtapeStore((s) => s.seek)
  const { hidden, toggle: toggleHidden, show } = useDeckHide()
  const [listOpen, setListOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (prefersReducedMotion()) {
      gsap.set(el, { y: hidden ? '100%' : '0%' })
      return
    }
    gsap.to(el, { y: hidden ? '100%' : '0%', duration: 0.35, ease: 'power3.inOut', overwrite: true })
  }, [hidden])

  const track = MIXTAPE_TRACKS[currentIndex]
  const pct = duration > 0 ? (progress / duration) * 100 : 0
  const repeatGlyph = repeat === 'one' ? '↻¹' : repeat === 'all' ? '↻' : '⤿'

  return (
    <>
      {hidden && (
        <button type="button" className="viz-deck-reveal" aria-label="Show player" onClick={show} />
      )}
      <div ref={rootRef} className={`viz-deck ${isPlaying ? 'is-playing' : ''}`} aria-label="Mixtape deck">
        <Tracklist open={listOpen} />
        <div className="viz-deck-bar">
          <div className="viz-reels" aria-hidden="true">
            <span className="viz-reel" /><span className="viz-reel" />
          </div>
          <div className="viz-deck-now">
            <p className="mixtape-now-movie">{MOVIE_LABEL[track.movie]}</p>
            <h2 className="viz-deck-title">{track.title}</h2>
            <p className="viz-deck-artist">{track.artist}</p>
          </div>
          <div className="viz-deck-scrub">
            <input
              type="range" min={0} max={duration || 0} step={0.1} value={progress}
              onChange={(e) => seek(parseFloat(e.target.value))}
              aria-label="Track progress"
              style={{ '--mixtape-pct': `${pct}%` } as React.CSSProperties}
            />
            <div className="mixtape-now-time"><span>{fmt(progress)}</span><span>{fmt(duration)}</span></div>
          </div>
          <div className="viz-deck-transport">
            <button type="button" onClick={toggleShuffle} className={`mixtape-control-btn ${shuffle ? 'is-active' : ''}`} aria-label="Toggle shuffle" aria-pressed={shuffle} data-spider-sense>⇌</button>
            <button type="button" onClick={prev} className="mixtape-control-btn" aria-label="Previous track" data-spider-sense>⏮</button>
            <button type="button" onClick={toggle} className="mixtape-control-play" aria-label={isPlaying ? 'Pause' : 'Play'} data-spider-sense>{isPlaying ? '⏸' : '▶'}</button>
            <button type="button" onClick={next} className="mixtape-control-btn" aria-label="Next track" data-spider-sense>⏭</button>
            <button type="button" onClick={cycleRepeat} className={`mixtape-control-btn ${repeat !== 'off' ? 'is-active' : ''}`} aria-label={`Repeat: ${repeat}`} data-spider-sense>{repeatGlyph}</button>
            <label className="mixtape-volume"><span>VOL</span>
              <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} aria-label="Volume" />
            </label>
            <button type="button" onClick={() => setListOpen((o) => !o)} className={`mixtape-control-btn ${listOpen ? 'is-active' : ''}`} aria-label="Toggle tracklist" aria-expanded={listOpen} data-spider-sense>≡</button>
            <button type="button" onClick={toggleHidden} className="mixtape-control-btn" aria-label="Hide player (H)" title="Hide (H)" data-spider-sense>⌄</button>
          </div>
        </div>
      </div>
    </>
  )
}

function fmt(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
