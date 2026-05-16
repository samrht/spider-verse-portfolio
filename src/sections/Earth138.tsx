import { UniverseShell } from '../components/UniverseShell'
import { ProjectCard } from '../components/ProjectCard'
import { projects } from '../data/projects'

export function Earth138() {
  const list = projects.filter((p) => p.universe === 'earth-138')

  return (
    <UniverseShell universe="earth-138">
      <div className="universe-content">
        <header className="universe-hero">
          <h2 className="font-display">Earth-138</h2>
          <p className="tagline">Tear it down. Build it better.</p>
          <p className="meta">Open source · Spider-Punk</p>
        </header>

        <div className="projects-grid">
          {list.map((p) => (
            <ProjectCard key={p.id} {...p} />
          ))}
        </div>
      </div>

      <div className="universe-decor decor-earth-138" aria-hidden />
    </UniverseShell>
  )
}
