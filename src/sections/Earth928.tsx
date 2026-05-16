import { UniverseShell } from '../components/UniverseShell'
import { ProjectCard } from '../components/ProjectCard'
import { projects } from '../data/projects'

export function Earth928() {
  const list = projects.filter((p) => p.universe === 'earth-928')

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
      </div>

      <div className="universe-decor decor-earth-928" aria-hidden />
    </UniverseShell>
  )
}
