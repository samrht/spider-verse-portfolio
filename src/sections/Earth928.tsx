import { UniverseShell } from '../components/UniverseShell'
import { ProjectCard } from '../components/ProjectCard'
import { projects } from '../data/projects'
import { useSuitStore } from '../store/suitStore'

export function Earth928() {
  const list = projects.filter((p) => p.universe === 'earth-928')
  const openSuit = useSuitStore((s) => s.openSuit)

  return (
    <UniverseShell universe="earth-928">
      <div className="universe-content">
        <header className="universe-hero">
          <h2 className="font-display">Earth-928</h2>
          <p className="tagline">The future is already here.</p>
          <p className="meta">AI / Future · Spider-Man 2099</p>
        </header>

        <div className="projects-grid">
          {list.map((p) => (
            <ProjectCard key={p.id} {...p} />
          ))}
        </div>

        <button
          type="button"
          className="suit-os-panel"
          onClick={() => void openSuit()}
          data-spider-sense
          aria-label="Initialize the Spider-Man 2099 Suit OS"
        >
          <span className="suit-os-status">
            ◈ SPIDER-MAN 2099 SUIT OS — AVAILABLE
          </span>
          <span className="suit-os-cta">[ INITIALIZE SUIT SYSTEMS ]</span>
        </button>
      </div>

      <div className="universe-decor decor-earth-928" aria-hidden />
    </UniverseShell>
  )
}
