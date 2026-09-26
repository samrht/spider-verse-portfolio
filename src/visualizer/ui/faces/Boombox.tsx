import type { FaceProps } from './index'
import { ScrubRange, Times, ShuffleButton, PrevButton, PlayButton, NextButton, RepeatButton, VolumeRange, ListButton, HideButton } from './parts'
import '../../../styles/faces/boombox.css'

// Toon: a chunky Saturday-morning boombox (spec §4.2). Speaker cones pump
// with the page's --beat variable.
export function Boombox({ c }: FaceProps) {
  return (
    <div className="face-boombox" data-face="boombox">
      <span className="boom-speaker" aria-hidden="true" />
      <div className="boom-body">
        <p className="boom-movie">{c.movieLabel}</p>
        <h2 className="boom-title">{c.track.title}</h2>
        <p className="boom-artist">{c.track.artist}</p>
        <ScrubRange c={c} className="boom-scrub" />
        <Times c={c} className="boom-times" />
      </div>
      <div className="boom-transport">
        <ShuffleButton c={c} className="boom-btn" />
        <PrevButton c={c} className="boom-btn" />
        <PlayButton c={c} className="boom-play" />
        <NextButton c={c} className="boom-btn" />
        <RepeatButton c={c} className="boom-btn" />
        <VolumeRange c={c} className="boom-volume" />
        <ListButton c={c} className="boom-btn" />
        <HideButton c={c} className="boom-btn" />
      </div>
      <span className="boom-speaker boom-speaker-r" aria-hidden="true" />
    </div>
  )
}
