import type { TargetName } from '../engine/morph'
import { sphere } from './sphere'
import { cloud } from './cloud'
import { web } from './web'
import { explosion } from './explosion'
import { emblem } from './emblem'

export type TargetFn = (n: number, seed: number) => Float32Array

export const TARGETS: Record<TargetName, TargetFn> = { sphere, cloud, web, explosion, emblem }

const cache = new Map<string, Float32Array>()

// Targets are pure functions of (name, n, seed); memoise so a morph back to
// a shape doesn't recompute 40k points on the main thread.
export function bakeTarget(name: TargetName, n: number, seed: number): Float32Array {
  const key = `${name}:${n}:${seed}`
  let a = cache.get(key)
  if (!a) {
    a = TARGETS[name](n, seed)
    cache.set(key, a)
  }
  return a
}
