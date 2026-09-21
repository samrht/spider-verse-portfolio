import { COVER } from '../data/cover'
import { stillById } from '../data/stills'
import { Still } from './primitives'

// Issue #1 cover: first viewport. Cover lines anchor to the panels. The
// page-lift (Task 7) pins this section briefly and rotates it away.
export function Cover() {
  const still = stillById(COVER.stillId)!
  return (
    <section className="comic-cover" data-universe="616" data-motion="cover" aria-label="Cover">
      <header className="cover-masthead">
        <h1>{COVER.masthead}</h1>
        <p className="cover-issue"><span>{COVER.issue}</span><span>{COVER.price}</span></p>
      </header>
      <div className="cover-still"><Still still={still} eager /></div>
      <ul className="cover-lines">
        {COVER.coverLines.map((c) => (
          <li key={c.universeId}><a href={`#u-${c.universeId}`}>{c.text}</a></li>
        ))}
      </ul>
      <p className="cover-hint" aria-hidden="true">SCROLL TO OPEN ▼</p>
    </section>
  )
}
