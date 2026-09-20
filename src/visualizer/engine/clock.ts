// Monotonic seconds for the morph machine (R13). Fed from useFrame's dt so
// it never depends on playback position: pausing, scrubbing backwards or a
// 250 ms progress poll can't stall or step a 900 ms transition.
export class MonotonicClock {
  now = 0

  tick(dt: number): number {
    if (Number.isFinite(dt) && dt > 0) this.now += dt
    return this.now
  }
}
