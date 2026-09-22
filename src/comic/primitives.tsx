import { useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { PAPER_FALLBACK, type Still as StillDef } from '../data/stills'

// Small comic devices. All styling comes from comic.css via the skin contract.

export function CaptionBox({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`comic-caption ${className}`.trim()}>{children}</div>
}

export function SpeechBubble({ children, tail = 'left' }: { children: ReactNode; tail?: 'left' | 'right' }) {
  return <div className="comic-bubble" data-tail={tail}>{children}</div>
}

export function SfxWord({ children, ...rest }: { children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return <span className="comic-sfx" aria-hidden="true" {...rest}>{children}</span>
}

// An official still. Falls back to the paper texture on load error so a
// missing file never shows a broken image.
export function Still({ still, eager = false, priority = false, className = '' }: { still: StillDef; eager?: boolean; priority?: boolean; className?: string }) {
  const [src, setSrc] = useState(still.src)
  return (
    <img
      className={`comic-still ${className}`.trim()}
      src={src}
      alt={still.alt}
      loading={eager || priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      onError={() => { if (src !== PAPER_FALLBACK) setSrc(PAPER_FALLBACK) }}
    />
  )
}
