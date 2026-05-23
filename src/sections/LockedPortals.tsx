import { Link } from 'react-router-dom'

interface Portal {
  path: string
  label: string
  phase: 2 | 3
}

const PORTALS: Portal[] = [
  { path: '/suit',       label: 'Spider-Suit HUD', phase: 2 },
  { path: '/bugle',      label: 'Daily Bugle',     phase: 2 },
  { path: '/mixtape',    label: 'The Mixtape',     phase: 2 },
  { path: '/story',      label: 'The Story',       phase: 2 },
  { path: '/mission',    label: 'The Mission',     phase: 3 },
  { path: '/multiverse', label: 'The Multiverse',  phase: 3 },
]

// Final section after the four universes. Hexagonal padlock cards that route
// into the LockedPage stub for now — Phase 2/3 will swap them for real apps.
export function LockedPortals() {
  return (
    <section
      id="portals"
      className="locked-portals"
      aria-label="Locked portals — Phase 2 and Phase 3"
      data-spider-sense
    >
      <div className="universe-content">
        <header className="universe-hero">
          <p className="meta">◇ Multiverse Gateway · Restricted ◇</p>
          <h2 className="font-display">Other Universes</h2>
          <p className="tagline">Sealed for now. Coming through the cracks.</p>
        </header>

        <ul className="portal-grid">
          {PORTALS.map((p) => (
            <li key={p.path} className="portal-cell">
              <Link
                to={p.path}
                className="portal-card"
                data-phase={p.phase}
                data-spider-sense
                aria-label={`${p.label} PHASE ${p.phase} — locked, clearance required`}
              >
                <span className="portal-lock" aria-hidden="true">⌬</span>
                <span className="portal-label">{p.label}</span>
                <span className="portal-phase">PHASE {p.phase}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
