import { UniverseShell } from '../components/UniverseShell'
import { ProjectCard } from '../components/ProjectCard'
import { projects } from '../data/projects'

export function Earth65() {
  const list = projects.filter((p) => p.universe === 'earth-65')

  return (
    <UniverseShell universe="earth-65">
      <div className="universe-content">
        <header className="universe-hero">
          <h2 className="font-display">Earth-65</h2>
          <p className="tagline">Okay, I can do this.</p>
          <p className="meta">Design work · Gwen Stacy</p>
        </header>

        <div className="projects-grid">
          {list.map((p) => (
            <ProjectCard key={p.id} {...p} />
          ))}
        </div>
      </div>

      <div className="universe-decor decor-earth-65" aria-hidden />
    </UniverseShell>
  )
}
