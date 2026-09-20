import { ComicPanel } from './ComicPanel'
import { SfxWord, SpeechBubble, Still } from './primitives'
import { ProjectFrame } from './ProjectFrame'
import { universeById } from '../data/universes'
import { stillById } from '../data/stills'
import { projectBySlug } from '../data/projects'
import type { Universe } from '../store/universeStore'

// Grid layout: the panel is itself a comic page — still sub-panel, title +
// speech bubble, then project frames in rows of three that land in reading
// order (motion in comic/motion.ts). The sfx word pops on the first frame.
export function GridPanel({ universe }: { universe: Universe }) {
  const u = universeById(universe)
  const still = stillById(u.stillId)!
  const items = u.itemSlugs.map(projectBySlug).filter((p): p is NonNullable<typeof p> => !!p)

  return (
    <ComicPanel universe={universe} className="grid">
      <div className="grid-still" data-motion="enter"><Still still={still} /></div>
      <div className="grid-head" data-motion="enter">
        <p className="comic-kicker">{u.chapter.kicker}</p>
        <h2 className="comic-title">{u.chapter.title}</h2>
        <SpeechBubble>{u.chapter.tagline}</SpeechBubble>
      </div>
      <ul className="grid-frames">
        {items.map((p, i) => (
          <li key={p.slug} data-testid="grid-frame" data-motion="frame" className="grid-frame">
            {i === 0 && <SfxWord>{u.sfx}</SfxWord>}
            <ProjectFrame project={p} />
          </li>
        ))}
      </ul>
    </ComicPanel>
  )
}
