interface Props {
  /** Pixel length of the thread. */
  length?: number
  /** Stroke width in pixels. */
  width?: number
  /** Side of the parent the thread anchors to. */
  anchor?: 'top' | 'bottom' | 'left' | 'right'
  /** Decorative offset from the anchor (px). */
  offset?: number
  /** Optional className for layout sugar. */
  className?: string
  /** Override the stroke color. Defaults to the active universe primary. */
  color?: string
}

// Decorative SVG web-thread. Used for section ornamentation; the cursor's
// click-shoot threads live in webCursor.ts since they're behavior, not decor.
export function WebThread({
  length = 140,
  width = 1.25,
  anchor = 'top',
  offset = 0,
  className,
  color,
}: Props) {
  const horizontal = anchor === 'left' || anchor === 'right'
  const w = horizontal ? length : width + 2
  const h = horizontal ? width + 2 : length
  const x1 = horizontal ? 0 : w / 2
  const y1 = horizontal ? h / 2 : 0
  const x2 = horizontal ? w : w / 2
  const y2 = horizontal ? h / 2 : h

  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    [anchor]: offset,
    ...(anchor === 'top' || anchor === 'bottom'
      ? { left: '50%', transform: 'translateX(-50%)' }
      : { top: '50%', transform: 'translateY(-50%)' }),
  }

  return (
    <svg
      className={className}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      style={positionStyle}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color ?? 'var(--universe-primary)'}
        strokeWidth={width}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color ?? 'var(--universe-primary)'})` }}
      />
    </svg>
  )
}
