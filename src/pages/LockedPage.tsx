import { Link } from 'react-router-dom'

interface Props {
  phase: 2 | 3
  concept: string
}

// Stand-in for every Phase 2 / Phase 3 route. Full-screen, dark, glitch-y,
// makes it clear the universe exists but isn't accessible yet. The look is
// intentionally generic-classified — each real page replaces this when its
// phase lands.
export function LockedPage({ phase, concept }: Props) {
  return (
    <main className="locked-page" data-spider-sense>
      <div className="locked-frame">
        <p className="locked-eyebrow">
          ◇ ACCESS · {String(phase).padStart(2, '0')}{phase * 71} · LOCKED ◇
        </p>
        <h1 className="locked-title" data-text={concept}>
          {concept}
        </h1>
        <p className="locked-status">
          UNIVERSE NOT YET ACCESSIBLE
        </p>
        <p className="locked-clearance">
          PHASE {phase} CLEARANCE REQUIRED
        </p>
        <div className="locked-rule" />
        <Link to="/" className="locked-back">
          ← RETURN TO THE MOTHERSHIP
        </Link>
      </div>
    </main>
  )
}
