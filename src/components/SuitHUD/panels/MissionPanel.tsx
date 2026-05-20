import { MISSIONS } from '../../../data/suitMissions'
import { AUGMENTATIONS } from '../../../data/suitAugmentations'

// MISSION panel — the current "active mission" card + augmentations rundown.
// The /suit page mounts a fuller mission log; this is the overlay's at-a-glance.
export function MissionPanel() {
  // Pick the first ACTIVE mission; if there's none, fall back to whatever's
  // first in the list (still useful for the demo placeholder data).
  const activeMission =
    MISSIONS.find((m) => m.status === 'ACTIVE') ?? MISSIONS[0]

  return (
    <section className="suit-panel suit-panel-mission" aria-label="Active mission">
      <header className="suit-panel-label">ACTIVE MISSION</header>
      <h3 className="suit-mission-codename font-display">
        {activeMission.codename}
      </h3>
      <p className="suit-mission-desc">{activeMission.description}</p>
      <ul className="suit-mission-stack" aria-label="Mission stack">
        {activeMission.stack.map((t) => (
          <li
            key={t}
            className="font-mono uppercase tracking-wider"
            style={{
              fontSize: 'var(--text-xs)',
              border: '1px solid var(--universe-accent)',
              color: 'var(--universe-accent)',
              padding: '0.2rem 0.5rem',
            }}
          >
            {t}
          </li>
        ))}
      </ul>
      <div className={`suit-mission-status suit-status-${activeMission.status.toLowerCase()}`}>
        STATUS: {activeMission.status}
      </div>

      <header className="suit-panel-label suit-aug-label">AUGMENTATIONS</header>
      <ul className="suit-augmentations">
        {AUGMENTATIONS.map((a) => (
          <li key={a.name}>
            <span className="suit-aug-arrow">▸</span>
            <span className="suit-aug-name">{a.name}</span>
            <span className="suit-aug-dots" aria-hidden="true" />
            <span className="suit-aug-status">ONLINE</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
