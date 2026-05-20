import { getThreatLevel } from '../data/threatMatrix'
import type {
  GitHubTelemetry,
  SuitTelemetry,
  WeatherTelemetry,
} from '../types/suit'

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0)
  // Account for DST by working in UTC-local difference.
  const diff =
    d.getTime() -
    start.getTime() +
    (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60_000
  return Math.floor(diff / 86_400_000)
}

// Combines GitHub + weather + a captured "now" into the full HUD telemetry
// shape. Time is captured at build-call site so panels can re-derive a clock
// from this single source of truth while testing.
export function buildSuitTelemetry(
  github: GitHubTelemetry,
  weather: WeatherTelemetry,
  now: Date = new Date(),
): SuitTelemetry {
  return {
    github,
    weather,
    time: now,
    threatLevel: getThreatLevel(now.getHours(), github.openIssues),
    missionDay: dayOfYear(now),
  }
}
