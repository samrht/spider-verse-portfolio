import { describe, it, expect } from 'vitest'
import { nextUniverse, labelFor, pageOf } from '../pageNav'

describe('pageNav helpers', () => {
  it('steps through story order without wrapping', () => {
    expect(nextUniverse('616', 1)).toBe('mcu')
    expect(nextUniverse('verse', 1)).toBe('verse')
    expect(nextUniverse('616', -1)).toBe('616')
    expect(nextUniverse('toon', -1)).toBe('mcu')
  })
  it('labels and page numbers', () => {
    expect(labelFor('616')).toBe('EARTH-616')
    expect(labelFor('verse')).toBe('SPIDER-VERSE')
    expect(pageOf('616')).toBe(1)
    expect(pageOf('verse')).toBe(4)
  })
})
