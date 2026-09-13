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
  private from_: TargetName = 'sphere'
  private to_: TargetName = 'sphere'
  private progress_ = 1
  private transitioning_ = false

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
  private forcedReturn = false      // marks pending = 'sphere' from explosion timeout

  get from(): TargetName { return this.from_ }
  get to(): TargetName { return this.to_ }
  get progress(): number { return this.progress_ }
  get transitioning(): boolean { return this.transitioning_ }

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

    if (this.transitioning_) {
      this.progress_ = Math.min(1, (nowS - this.startedAt) / this.transitionS)
      if (this.progress_ >= 1) {
        this.transitioning_ = false
        this.from_ = this.to_
      }
      return null
    }

    // emblem window expired → release whatever was queued behind it
    if (this.pendingAfterEmblem && nowS >= this.emblemUntil) {
      this.pending = this.pendingAfterEmblem
      this.pendingAfterEmblem = null
    }

    // explosion always snaps back, overriding any other pending target
    if (this.to_ === 'explosion' && nowS - this.arrivedAt >= this.explosionReturnS) {
      this.pending = 'sphere'
      this.forcedReturn = true
    }

    if (this.pending === null) return null
    const next = this.pending
    if (next === this.to_) { this.pending = null; return null }
    const dwellOk = next === 'emblem' || this.forcedReturn || nowS - this.arrivedAt >= this.dwellS
    if (!dwellOk) return null

    this.pending = null
    this.forcedReturn = false
    const ev: MorphEvent = { type: 'start', from: this.to_, to: next }
    this.from_ = this.to_
    this.to_ = next
    this.startedAt = nowS
    this.arrivedAt = nowS
    this.progress_ = 0
    this.transitioning_ = true
    return ev
  }
}
