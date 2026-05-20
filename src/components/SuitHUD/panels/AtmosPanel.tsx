import { useSuitStore } from '../../../store/suitStore'
import type { WeatherFamily } from '../../../types/suit'

// Tiny inline SVG icons keyed by WMO family. currentColor lets each icon
// inherit the universe primary tint, so no per-mode swaps are needed.
function WeatherIcon({ family }: { family: WeatherFamily }) {
  const stroke = 'currentColor'
  const sw = 1.6
  switch (family) {
    case 'clear':
      return (
        <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden="true">
          <circle cx="16" cy="16" r="6" fill="none" stroke={stroke} strokeWidth={sw} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2
            return (
              <line
                key={i}
                x1={16 + Math.cos(a) * 9}
                y1={16 + Math.sin(a) * 9}
                x2={16 + Math.cos(a) * 13}
                y2={16 + Math.sin(a) * 13}
                stroke={stroke}
                strokeWidth={sw}
                strokeLinecap="round"
              />
            )
          })}
        </svg>
      )
    case 'cloud':
      return (
        <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden="true">
          <path
            d="M9 21 Q4 21 4 16.5 Q4 12 9 12 Q10 8 15 8 Q21 8 22 13 Q27 13 27 17 Q27 21 22 21 Z"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'rain':
      return (
        <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden="true">
          <path
            d="M9 18 Q4 18 4 14 Q4 10 9 10 Q10 6 15 6 Q21 6 22 11 Q27 11 27 15 Q27 18 22 18 Z"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          {[10, 16, 22].map((x) => (
            <line
              key={x}
              x1={x}
              y1={22}
              x2={x - 2}
              y2={28}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinecap="round"
            />
          ))}
        </svg>
      )
    case 'snow':
      return (
        <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2
            return (
              <line
                key={i}
                x1={16}
                y1={16}
                x2={16 + Math.cos(a) * 10}
                y2={16 + Math.sin(a) * 10}
                stroke={stroke}
                strokeWidth={sw}
                strokeLinecap="round"
              />
            )
          })}
          <circle cx="16" cy="16" r="2" fill={stroke} />
        </svg>
      )
    case 'storm':
      return (
        <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden="true">
          <path
            d="M9 16 Q4 16 4 12 Q4 8 9 8 Q10 4 15 4 Q21 4 22 9 Q27 9 27 13 Q27 16 22 16 Z"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path
            d="M16 16 L12 24 L16 24 L13 30"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'fog':
      return (
        <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden="true">
          {[10, 16, 22].map((y) => (
            <line
              key={y}
              x1={4}
              y1={y}
              x2={28}
              y2={y}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinecap="round"
              opacity={y === 16 ? 1 : 0.7}
            />
          ))}
        </svg>
      )
  }
}

// ATMOS panel — city, temperature, condition string mapped from the WMO code.
export function AtmosPanel() {
  const telemetry = useSuitStore((s) => s.telemetry)
  const weather = telemetry?.weather

  return (
    <section className="suit-panel suit-panel-atmos" aria-label="Atmospheric sensors">
      <header className="suit-panel-label">ATMOSPHERIC</header>
      <div className="suit-atmos-row">
        <div className="suit-atmos-icon">
          <WeatherIcon family={weather?.family ?? 'cloud'} />
        </div>
        <div className="suit-atmos-readout">
          <div className="suit-atmos-temp">
            {weather ? `${Math.round(weather.tempC)}°C` : '--°C'}
          </div>
          <div className="suit-atmos-city">{weather?.city ?? '—'}</div>
        </div>
      </div>
      <div className="suit-atmos-condition">
        {weather?.conditionLabel ?? 'AWAITING UPLINK…'}
      </div>
    </section>
  )
}
