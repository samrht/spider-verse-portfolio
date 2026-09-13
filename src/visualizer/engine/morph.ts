import type { SectionEnergy } from '../signal/types'

// Pure morph state machine. The engine asks `update(now)` every frame and
// reacts to a returned 'start' event by re-baking target buffers. Time is
// injected so tests are deterministic.

export type TargetName = 'sphere' | 'cloud' | 'web' | 'explosion' | 'emblem'

export interface MorphEvent { type: 'start'; from: TargetName; to: TargetName }

export interface MorphOptions {
  transitionMs?: number   // default 900
  dwellS?: number         // minimum time in a shape, default 6
  explosionReturnS?: number // default 4
  emblemS?: number        // emblem window at track start, default 3
  enabled?: boolean       // false = never morph (reduced motion)
}

export function targetForSection(e: SectionEnergy): TargetName {
  switch (e) {
    case 'low': return 'sphere'
    case 'mid': return 'web'
    case 'high': return 'cloud'
    case 'drop': return 'explosion'
  }
}

export class MorphMachine {
  from: TargetName = 'sphere'
  to: TargetName = 'sphere'
  progress = 1
  transitioning = false

  private readonly transitionS: number
  private readonly dwellS: number
  private readonly explosionReturnS: number
  private readonly emblemS: number
  private readonly enabled: boolean
  private pendingAfterEmblem: TargetName | null = null

  private startedAt = -Infinity     // when the current transition began
  private arrivedAt = -Infinity     // when we last settled into `to`
  private pending: TargetName | null = null
  private emblemUntil = -Infinity
  private lastSection = -1

  constructor(opts: MorphOptions = {}) {
    this.transitionS = (opts.transitionMs ?? 900) / 1000
    this.dwellS = opts.dwellS ?? 6
    this.explosionReturnS = opts.explosionReturnS ?? 4
    this.emblemS = opts.emblemS ?? 3
    this.enabled = opts.enabled ?? true
  }

  onTrackStart(nowS: number): void {
    if (!this.enabled) return
    this.lastSection = -1
    if (this.emblemS > 0) {
      this.emblemUntil = nowS + this.emblemS
      this.pending = 'emblem'
      this.arrivedAt = -Infinity // emblem ignores dwell
    }
  }

  onSection(index: number, energy: SectionEnergy, nowS: number): void {
    if (!this.enabled) return
    if (index === this.lastSection) return
    this.lastSection = index
    const target = targetForSection(energy)
    if (nowS < this.emblemUntil) {
      // queue behind the emblem window
      this.pendingAfterEmblem = target
      return
    }
    this.pending = target
  }

  update(nowS: number): MorphEvent | null {
    if (!this.enabled) return null

    if (this.transitioning) {
      this.progress = Math.min(1, (nowS - this.startedAt) / this.transitionS)
      if (this.progress >= 1) {
        this.transitioning = false
        this.from = this.to
      }
      return null
    }

    // emblem window expired → release whatever was queued behind it
    if (this.pendingAfterEmblem && nowS >= this.emblemUntil) {
      this.pending = this.pendingAfterEmblem
      this.pendingAfterEmblem = null
    }

    // explosion always snaps back
    if (this.to === 'explosion' && nowS - this.arrivedAt >= this.explosionReturnS && this.pending === null) {
      this.pending = 'sphere'
    }

    if (this.pending === null) return null
    const next = this.pending
    if (next === this.to) { this.pending = null; return null }
    const dwellOk = next === 'emblem' || nowS - this.arrivedAt >= this.dwellS
    if (!dwellOk) return null

    this.pending = null
    const ev: MorphEvent = { type: 'start', from: this.to, to: next }
    this.from = this.to
    this.to = next
    this.startedAt = nowS
    this.arrivedAt = nowS
    this.progress = 0
    this.transitioning = true
    return ev
  }
}
