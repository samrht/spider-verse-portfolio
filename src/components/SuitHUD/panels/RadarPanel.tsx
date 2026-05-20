// NYC PATROL GRID — SVG radar, pure CSS rotation on the sweep line.
// Six "blip" zones map to real NYC districts; positions are radians +
// distance-from-centre, so they fall on natural-looking arcs. Stroke colour
// rides --universe-primary; fill of each blip rides the per-mode class
// (.suit-earth1610 .radar-blip etc) defined in suit.css.

interface Blip {
  label: string
  angle: number // radians
  distance: number // 0–1, fraction of radar radius
}

const BLIPS: Blip[] = [
  { label: 'QUEENS', angle: 0.35, distance: 0.78 },
  { label: 'MIDTOWN', angle: 1.55, distance: 0.45 },
  { label: 'BROOKLYN', angle: 2.4, distance: 0.7 },
  { label: 'HARLEM', angle: 4.1, distance: 0.6 },
  { label: 'BRONX', angle: 5.05, distance: 0.85 },
  { label: 'SOHO', angle: 5.85, distance: 0.32 },
]

export function RadarPanel() {
  const cx = 100
  const cy = 100
  const r = 88

  return (
    <section className="suit-panel suit-panel-radar" aria-label="NYC patrol radar">
      <header className="suit-panel-label">NYC PATROL GRID — SECTOR 7</header>
      <svg viewBox="0 0 200 200" className="suit-radar-svg" role="img">
        {/* Concentric range rings */}
        <circle cx={cx} cy={cy} r={r}      fill="none" stroke="currentColor" strokeOpacity="0.55" />
        <circle cx={cx} cy={cy} r={r * 0.66} fill="none" stroke="currentColor" strokeOpacity="0.35" />
        <circle cx={cx} cy={cy} r={r * 0.33} fill="none" stroke="currentColor" strokeOpacity="0.25" />

        {/* Crosshairs */}
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="currentColor" strokeOpacity="0.2" />
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="currentColor" strokeOpacity="0.2" />

        {/* Sweep — CSS rotates the wedge */}
        <g className="suit-radar-sweep">
          <defs>
            <linearGradient id="suit-radar-sweep-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.45" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`M ${cx} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(-0.35)} ${cy + r * Math.sin(-0.35)} Z`}
            fill="url(#suit-radar-sweep-grad)"
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx + r}
            y2={cy}
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </g>

        {/* District blips */}
        {BLIPS.map((b) => {
          const x = cx + Math.cos(b.angle) * r * b.distance
          const y = cy + Math.sin(b.angle) * r * b.distance
          // Push label slightly outward so it doesn't sit on the dot.
          const lx = cx + Math.cos(b.angle) * (r * b.distance + 10)
          const ly = cy + Math.sin(b.angle) * (r * b.distance + 10) + 2
          return (
            <g key={b.label}>
              <circle cx={x} cy={y} r="3" className="radar-blip" />
              <circle
                cx={x}
                cy={y}
                r="3"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.4"
              />
              <text x={lx} y={ly} className="suit-radar-label" textAnchor="middle">
                {b.label}
              </text>
            </g>
          )
        })}

        {/* Outer ring label */}
        <text x={cx} y={cy - r - 4} textAnchor="middle" className="suit-radar-ring-label">
          PATROL RANGE
        </text>
      </svg>
    </section>
  )
}
