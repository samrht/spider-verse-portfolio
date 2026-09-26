import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { ParticleField } from '../ParticleField'
import { createSignal } from '../../signal/types'

const sig = () => createSignal()

describe('ParticleField.setUniverse', () => {
  it('applies the first universe instantly (no tween from verse)', () => {
    const f = new ParticleField(200)
    f.setUniverse('616', true)
    const s = f.snapshot()
    expect(s.tweening).toBe(false)
    expect(s.palette[0]).toBe('#e53222')
    expect(s.style).toBe(0)
    expect(s.blending).toBe(THREE.NormalBlending)
  })

  it('tweens colours and switches style/blend at the midpoint', () => {
    const f = new ParticleField(200)
    f.setUniverse('verse', true)
    f.setUniverse('toon')
    expect(f.snapshot().tweening).toBe(true)
    f.update(sig(), 0.1)                       // 25 %: still verse style
    expect(f.snapshot().blending).toBe(THREE.AdditiveBlending)
    f.update(sig(), 0.15)                      // 62 %: style switched
    expect(f.snapshot().style).toBe(2)
    expect(f.snapshot().blending).toBe(THREE.NormalBlending)
    f.update(sig(), 0.5)                       // done
    const s = f.snapshot()
    expect(s.tweening).toBe(false)
    expect(s.palette).toEqual(['#ff3b3b', '#1f6feb', '#101010'])
  })

  it('switches instantly under reduced motion', () => {
    const f = new ParticleField(200, 1, true)
    f.setUniverse('mcu', true)
    f.setUniverse('616')
    expect(f.snapshot().tweening).toBe(false)
    expect(f.snapshot().palette[0]).toBe('#e53222')
  })

  it('a second switch mid-tween retargets from the current blend', () => {
    const f = new ParticleField(200)
    f.setUniverse('verse', true)
    f.setUniverse('616')
    f.update(sig(), 0.2)
    f.setUniverse('mcu')
    f.update(sig(), 1)
    expect(f.snapshot().palette[0]).toBe('#ff3b3b')
    expect(f.snapshot().style).toBe(1)
  })
})

describe('ParticleField.setPaletteOverride', () => {
  it('tweens to the override without changing style or blend', () => {
    const f = new ParticleField(200)
    f.setUniverse('mcu', true)
    const before = f.snapshot()
    f.setPaletteOverride(['#112233', '#445566', '#778899'])
    f.update(sig(), 1)
    const s = f.snapshot()
    expect(s.palette).toEqual(['#112233', '#445566', '#778899'])
    expect(s.style).toBe(before.style)
    expect(s.blending).toBe(before.blending)
  })

  it('null returns to the universe palette', () => {
    const f = new ParticleField(200)
    f.setUniverse('616', true)
    const universe = f.snapshot().palette
    f.setPaletteOverride(['#112233', '#445566', '#778899'])
    f.update(sig(), 1)
    f.setPaletteOverride(null)
    f.update(sig(), 1)
    expect(f.snapshot().palette).toEqual(universe)
  })

  it('a universe switch during an override keeps the override colours but takes the new style', () => {
    const f = new ParticleField(200)
    f.setUniverse('616', true)
    f.setPaletteOverride(['#112233', '#445566', '#778899'])
    f.update(sig(), 1)
    f.setUniverse('mcu')
    f.update(sig(), 1)
    const s = f.snapshot()
    expect(s.palette).toEqual(['#112233', '#445566', '#778899'])
    expect(s.style).toBe(1)
  })
})
