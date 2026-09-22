import { ComicPanel } from './ComicPanel'
import { CaptionBox, SfxWord, Still } from './primitives'
import { ProjectFrame } from './ProjectFrame'
import { universeById } from '../data/universes'
import { stillById } from '../data/stills'
import { projectBySlug } from '../data/projects'
import { BIO } from '../data/bio'
import type { Universe } from '../store/universeStore'

// Splash layout: one full-bleed still on one side, the chapter on the other
// with a single focus block (bio for 616, the first flagship for mcu), and
// a corner caption and the sfx word top-right of the body (it pops on enter).
// Motion attributes are read by comic/motion.ts.
export function SplashPanel({ universe }: { universe: Universe }) {
  const u = universeById(universe)
  const still = stillById(u.stillId)!
  const items = u.itemSlugs.map(projectBySlug).filter((p): p is NonNullable<typeof p> => !!p)
  const [focus, ...rest] = items
  const stillRight = universe === 'mcu'

  return (
    <ComicPanel universe={universe} className={`splash ${stillRight ? 'splash-still-right' : ''}`.trim()}>
      <div className="splash-still" data-motion="parallax">
        <Still still={still} eager={universe === '616'} />
      </div>
      <div className="splash-body">
        <SfxWord data-motion="enter">{u.sfx}</SfxWord>
        <p className="comic-kicker" data-motion="enter">{u.chapter.kicker}</p>
        <h2 className="comic-title" data-motion="enter">{u.chapter.title}</h2>
        <p className="comic-tagline" data-motion="enter">{u.chapter.tagline}</p>
        {universe === '616' ? (
          <div className="splash-focus" data-testid="focus-bio" data-motion="enter">
            {BIO.lines.map((l) => <p key={l}>{l}</p>)}
            <p className="splash-links">{BIO.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>)}</p>
          </div>
        ) : focus ? (
          <div className="splash-focus" data-testid="focus-project" data-motion="enter"><ProjectFrame project={focus} /></div>
        ) : null}
        {rest.length > 0 && (
          <ul className="splash-rest" data-testid="splash-rest" data-motion="enter">
            {rest.map((p) => <li key={p.slug}><a href={p.link ?? p.repoLink ?? '#'} target="_blank" rel="noopener noreferrer">{p.title}</a><span>{p.tags[0]}</span></li>)}
          </ul>
        )}
      </div>
      <CaptionBox className="splash-caption">{u.caption}</CaptionBox>
    </ComicPanel>
  )
}
