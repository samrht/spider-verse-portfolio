import type { ProviderKind } from '../signal/select'

const LABEL: Record<ProviderKind, string> = {
  live: 'LIVE FFT',
  beatmap: 'SYNCED',
  procedural: 'PROCEDURAL',
  idle: 'PROCEDURAL',
}

export function ModeBadge({ kind }: { kind: ProviderKind }) {
  return (
    <span className="viz-badge" data-kind={kind} aria-live="polite">
      {LABEL[kind]}
    </span>
  )
}
