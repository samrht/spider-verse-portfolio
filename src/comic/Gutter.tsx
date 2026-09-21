import { CaptionBox } from './primitives'
import type { Universe } from '../store/universeStore'

// The seam between two panels: a black band carrying the next panel's
// caption. `universe` is the FOLLOWING panel so the caption wears its skin.
// comic/motion.ts drives the tilt-and-settle + caption slide off scroll.
export function Gutter({ caption, universe }: { caption: string; universe: Universe }) {
  return (
    <div className="comic-gutter" data-universe={universe} data-motion="gutter" aria-hidden="true">
      <div className="comic-gutter-caption" data-motion="caption"><CaptionBox>{caption}</CaptionBox></div>
    </div>
  )
}
