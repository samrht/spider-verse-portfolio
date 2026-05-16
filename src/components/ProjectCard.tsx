import type { Project } from '../data/projects'

type Props = Project

// Card body for a single project. The Spider-Sense pulse rings are added by
// the spiderSense engine (Step 8); this component only declares the surface.
export function ProjectCard({ title, description, tags, link, repoLink, image }: Props) {
  const href = link ?? repoLink
  const Wrapper = href ? 'a' : 'article'

  return (
    <Wrapper
      {...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})}
      data-spider-sense
      className="group relative block p-6 no-underline transition-transform duration-200 hover:-translate-y-1"
      style={{
        background: 'var(--universe-surface)',
        border: '1px solid var(--universe-primary)',
        color: 'var(--universe-text)',
        boxShadow: 'var(--universe-glow)',
      }}
    >
      {image && (
        <div
          className="mb-4 aspect-video w-full overflow-hidden"
          style={{ borderBottom: '1px solid var(--universe-accent)' }}
        >
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <h3
        className="font-display mb-2"
        style={{
          fontSize: 'var(--text-xl)',
          color: 'var(--universe-primary)',
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </h3>

      <p
        className="mb-4 opacity-85 leading-snug"
        style={{ fontSize: 'var(--text-sm)' }}
      >
        {description}
      </p>

      <ul className="flex flex-wrap gap-2 m-0 p-0 list-none">
        {tags.map((t) => (
          <li
            key={t}
            className="font-mono uppercase tracking-wider px-2 py-1"
            style={{
              fontSize: 'var(--text-xs)',
              border: '1px solid var(--universe-accent)',
              color: 'var(--universe-accent)',
            }}
          >
            {t}
          </li>
        ))}
      </ul>
    </Wrapper>
  )
}
