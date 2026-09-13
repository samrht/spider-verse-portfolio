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
