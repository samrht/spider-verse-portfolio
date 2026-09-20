import type { Project } from '../data/projects'
import { useAudioStore } from '../store/audioStore'

// One project as an ink-bordered comic frame. Links out when it can.
export function ProjectFrame({ project }: { project: Project }) {
  const href = project.link ?? project.repoLink
  const body = (
    <>
      <h3 className="comic-frame-title">{project.title}</h3>
      <p className="comic-frame-blurb">{project.description}</p>
      <ul className="comic-frame-tags" aria-label="Tech">
        {project.tags.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </>
  )
  const common = {
    className: 'comic-frame',
    'data-spider-sense': true,
    onMouseEnter: () => useAudioStore.getState().playFX('hover'),
  }
  return href
    ? <a {...common} href={href} target="_blank" rel="noopener noreferrer" aria-label={project.title}>{body}</a>
    : <article {...common}>{body}</article>
}
