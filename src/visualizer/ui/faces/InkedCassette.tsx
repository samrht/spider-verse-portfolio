import type { FaceProps } from './index'
import { ScrubRange, Times, ShuffleButton, PrevButton, PlayButton, NextButton, RepeatButton, VolumeRange, ListButton, HideButton } from './parts'
import '../../../styles/faces/inked.css'

// 616: an inked cassette shell with a hand-lettered paper label (spec §4.2).
export function InkedCassette({ c }: FaceProps) {
  return (
    <div className="face-inked" data-face="inked-cassette">
      <div className="inked-shell">
        <span className="inked-reel" aria-hidden="true" />
        <div className="inked-label">
          <p className="inked-movie">{c.movieLabel}</p>
          <h2 className="inked-title">{c.track.title}</h2>
          <p className="inked-artist">{c.track.artist} <span className="inked-side">· SIDE A</span></p>
        </div>
        <span className="inked-reel" aria-hidden="true" />
      </div>
      <div className="inked-tape"><ScrubRange c={c} className="inked-scrub" /><Times c={c} className="inked-times" /></div>
      <div className="inked-transport">
        <ShuffleButton c={c} className="inked-btn" />
        <PrevButton c={c} className="inked-btn" />
        <PlayButton c={c} className="inked-play" />
        <NextButton c={c} className="inked-btn" />
        <RepeatButton c={c} className="inked-btn" />
        <VolumeRange c={c} className="inked-volume" />
        <ListButton c={c} className="inked-btn" />
        <HideButton c={c} className="inked-btn" />
      </div>
    </div>
  )
}
