import { UniverseShell } from '../components/UniverseShell'
import { ProjectCard } from '../components/ProjectCard'
import { projects } from '../data/projects'

export function Earth1610() {
  const list = projects.filter((p) => p.universe === 'earth-1610')

  return (
    <UniverseShell universe="earth-1610">
      <div className="universe-content">
        <header className="universe-hero">
          <h2 className="font-display">Earth-1610</h2>
          <p className="tagline">Whatever it takes.</p>
          <p className="meta">Dev projects · Miles Morales</p>
        </header>

        <div className="projects-grid">
          {list.map((p) => (
            <ProjectCard key={p.id} {...p} />
          ))}
        </div>
      </div>

      <div className="universe-decor decor-earth-1610" aria-hidden />
    </UniverseShell>
  )
}
