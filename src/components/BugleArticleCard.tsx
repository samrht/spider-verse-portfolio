import type { BugleArticle } from '../types/bugle'

interface BugleArticleCardProps {
  article: BugleArticle
  variant: 'compact' | 'full'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

// Article tile used by the sidebar (compact), the overlay grid (full), and
// the /bugle page (full). External URLs open in a new tab; in-app routes
// (the fictional Spider-Man stories pointing to /bugle) follow the normal
// SPA navigation. stopPropagation prevents the sidebar's collapse listener
// from firing when the user clicks a card.
export function BugleArticleCard({ article, variant }: BugleArticleCardProps) {
  const isExternal = /^https?:\/\//i.test(article.url)
  const linkProps = isExternal
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {}

  return (
    <a
      href={article.url}
      className="bugle-card"
      data-variant={variant}
      data-spider={article.isSpiderManStory || undefined}
      onClick={(e) => e.stopPropagation()}
      {...linkProps}
    >
      {variant === 'full' && article.imageUrl && (
        <div className="bugle-card-image">
          <img src={article.imageUrl} alt="" loading="lazy" />
        </div>
      )}
      <div className="bugle-card-body">
        <h3 className="bugle-card-headline">{article.headline}</h3>
        {variant === 'full' && article.lede && (
          <p className="bugle-card-lede">{article.lede}</p>
        )}
        <p className="bugle-card-meta">
          <span className="bugle-card-source">{article.source}</span>
          {variant === 'full' && (
            <>
              <span aria-hidden="true">·</span>
              <span className="bugle-card-date">
                {formatDate(article.publishedAt)}
              </span>
            </>
          )}
        </p>
        <p className="bugle-card-byline">
          By {article.reporter}, Daily Bugle Staff Writer
        </p>
      </div>
    </a>
  )
}
