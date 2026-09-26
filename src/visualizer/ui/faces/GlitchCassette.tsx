import type { FaceProps } from './index'
import { ScrubRange, Times, ShuffleButton, PrevButton, PlayButton, NextButton, RepeatButton, VolumeRange, ListButton, HideButton } from './parts'

// Verse: today's glitch cassette (spec §4.2), title with the red/cyan split.
export function GlitchCassette({ c }: FaceProps) {
  return (
    <div className="viz-deck-bar face-glitch" data-face="glitch-cassette">
      <div className="viz-reels" aria-hidden="true"><span className="viz-reel" /><span className="viz-reel" /></div>
      <div className="viz-deck-now">
        <p className="mixtape-now-movie">{c.movieLabel}</p>
        <h2 className="viz-deck-title">{c.track.title}</h2>
        <p className="viz-deck-artist">{c.track.artist}</p>
      </div>
      <div className="viz-deck-scrub"><ScrubRange c={c} /><Times c={c} /></div>
      <div className="viz-deck-transport">
        <ShuffleButton c={c} className="mixtape-control-btn" />
        <PrevButton c={c} className="mixtape-control-btn" />
        <PlayButton c={c} className="mixtape-control-play" />
        <NextButton c={c} className="mixtape-control-btn" />
        <RepeatButton c={c} className="mixtape-control-btn" />
        <VolumeRange c={c} />
        <ListButton c={c} className="mixtape-control-btn" />
        <HideButton c={c} className="mixtape-control-btn" />
      </div>
    </div>
  )
}
