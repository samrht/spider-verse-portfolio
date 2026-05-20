import type { ThreatLevel } from '../types/suit'

// Threat level logic — derives a single label from the current hour and the
// number of open GitHub issues. The brief: CRITICAL during the deep-night
// "3 a.m. commit" window, HIGH during late-night work, ELEVATED if too many
// open issues, LOW otherwise.
//
// 2 a.m. lives in BOTH the brief's "2-6am CRITICAL" and "10pm-2am HIGH"
// windows. We resolve in favour of CRITICAL (earlier check wins).
export function getThreatLevel(hour: number, openIssues: number): ThreatLevel {
  if (hour >= 2 && hour < 6) return 'CRITICAL'
  if (hour >= 22 || hour < 2) return 'HIGH'
  if (openIssues > 5) return 'ELEVATED'
  return 'LOW'
}

// Colours for the threat badge. LOW + CRITICAL ride the universe palette
// so they re-tint with each suit-mode swap; ELEVATED + HIGH are absolute
// amber/orange because they should always read as "rising danger" regardless
// of the active suit.
export const THREAT_COLORS: Record<ThreatLevel, string> = {
  LOW: 'var(--universe-accent)',
  ELEVATED: '#ffae00',
  HIGH: '#ff6a00',
  CRITICAL: 'var(--universe-primary)',
}

// Pulse cadence per threat level. Faster pulse at higher threat — the badge
// reuses the existing spider-pulse keyframe with this value inlined as
// animationDuration so no extra CSS is needed.
export const THREAT_PULSE_DURATION_MS: Record<ThreatLevel, number> = {
  LOW: 3000,
  ELEVATED: 2000,
  HIGH: 1000,
  CRITICAL: 400,
}
