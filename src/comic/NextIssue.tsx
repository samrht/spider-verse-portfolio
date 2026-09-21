import { STILLS } from '../data/stills'
import { BIO } from '../data/bio'
import { useSuitStore } from '../store/suitStore'

const TEASERS = ['THE STORY', 'THE MISSION', 'THE MULTIVERSE', 'CYBERSPIDER']

// Back cover: contact, still credits + takedown note, and the old locked
// portals as "NEXT ISSUE" stamps. The Suit HUD launchpad lives here too so
// it keeps a home when the visitor is outside the MCU panel.
export function NextIssue() {
  const openSuit = useSuitStore((s) => s.openSuit)
  return (
    <section className="comic-back" data-universe="verse" aria-label="Back cover">
      <div className="back-contact">
        <h2 className="comic-title">TO BE CONTINUED…</h2>
        <p>Want to build something? The mask is on the desk.</p>
        <p className="splash-links">{BIO.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>)}</p>
        <button type="button" className="back-suit" onClick={() => void openSuit()} data-spider-sense>[ INITIALIZE SUIT SYSTEMS ]</button>
      </div>
      <ul className="back-teasers" aria-label="Next issue">
        {TEASERS.map((t) => <li key={t}><span className="back-stamp">NEXT ISSUE</span>{t}</li>)}
      </ul>
      <aside className="back-credits">
        <h3>Still credits</h3>
        <ul>{STILLS.map((s) => <li key={s.id}>{s.credit.title} — © {s.credit.owner}</li>)}</ul>
        <p>Personal portfolio — not affiliated with Marvel, Sony, Disney or any studio listed. Stills are shown as fan tribute; if you're a rights holder and want one removed, reach out via the links above.</p>
      </aside>
    </section>
  )
}
