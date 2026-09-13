import { useMixtapeStore } from '../../store/mixtapeStore'
import { MIXTAPE_TRACKS } from '../../data/mixtape'

export function Tracklist({ open }: { open: boolean }) {
  const currentIndex = useMixtapeStore((s) => s.currentIndex)
  const isPlaying = useMixtapeStore((s) => s.isPlaying)
  const select = useMixtapeStore((s) => s.select)
  return (
    <div className={`viz-tracklist ${open ? 'is-open' : ''}`} aria-hidden={!open}>
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
                tabIndex={open ? 0 : -1}
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
        All tracks © Sony Pictures Entertainment / respective artists. Personal
        portfolio — not affiliated with Sony, Marvel, or any artist listed. Files
        served for browsing only; if you're a rights holder and want a track
        removed, reach out via the contact details on the home page.
      </p>
    </div>
  )
}
