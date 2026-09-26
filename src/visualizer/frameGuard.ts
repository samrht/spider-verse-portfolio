// Pure step for the §7 frame-time guard: accumulate consecutive slow
// frames (> 24 ms), reset on a good frame — but also reset (never
// accumulate) on a stall, since R3F's useFrame delta is uncapped and a
// backgrounded tab resuming after seconds away must not read as "2s of
// slow frames" and halve N from a single frame.
const SLOW_MS = 0.024
const STALL_MS = 0.25

export function nextOver(over: number, dt: number): number {
  if (dt > STALL_MS) return 0
  return dt > SLOW_MS ? over + dt : 0
}

// Two-stage guard (mixtape spec §5): the first sustained slowdown halves N;
// if frames stay slow, the second asks the page to drop the costly verse
// canvas filter. After that the guard stops watching.
export interface GuardState { over: number; trips: number }

export function guardStep(g: GuardState, dt: number): { next: GuardState; action: 'halve' | 'degrade' | null } {
  if (g.trips >= 2) return { next: g, action: null }
  const over = nextOver(g.over, dt)
  if (over < 2) return { next: { over, trips: g.trips }, action: null }
  const trips = g.trips + 1
  return { next: { over: 0, trips }, action: trips === 1 ? 'halve' : 'degrade' }
}
