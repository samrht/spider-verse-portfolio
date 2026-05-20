import { useEffect, useState } from 'react'
import { useSuitStore } from '../../../store/suitStore'
import {
  THREAT_COLORS,
  THREAT_PULSE_DURATION_MS,
} from '../../../data/threatMatrix'

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

// CHRON panel — live wall clock, mission day-of-year, threat-level badge.
// The clock ticks every second via setInterval; the threat level is derived
// from the store telemetry (which already factored hour-of-day in).
export function ChronPanel() {
  const telemetry = useSuitStore((s) => s.telemetry)
  const stale = useSuitStore((s) => s.telemetryStale)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const dayLabel = `${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]} ${pad(
    now.getDate(),
  )} ${MONTHS[now.getMonth()]}`

  const threat = telemetry?.threatLevel ?? 'LOW'
  const missionDay = telemetry?.missionDay ?? 0

  return (
    <section className="suit-panel suit-panel-chron" aria-label="Chronometer">
      <header className="suit-panel-label">CHRONOMETER</header>
      <div className="suit-clock">{time}</div>
      <div className="suit-mission-day">
        MISSION DAY {missionDay} — {dayLabel}
      </div>
      <div className="suit-threat-row">
        <span className="suit-threat-label">THREAT</span>
        <span
          className="suit-threat-badge"
          style={{
            color: THREAT_COLORS[threat],
            borderColor: THREAT_COLORS[threat],
            animationDuration: `${THREAT_PULSE_DURATION_MS[threat]}ms`,
          }}
        >
          {threat}
        </span>
      </div>
      {stale && <span className="suit-stale-chip">TELEMETRY: STALE</span>}
    </section>
  )
}
