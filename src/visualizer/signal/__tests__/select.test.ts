import { describe, it, expect } from 'vitest'
import { selectProvider } from '../select'

const base = {
  localPlaying: false, analyserAvailable: true, localHasBeatMap: false,
  spotifyPlaying: false, spotifyHasBeatMap: false,
}

describe('selectProvider', () => {
  it('prefers live FFT when a local track plays', () => {
    expect(selectProvider({ ...base, localPlaying: true })).toBe('live')
  })
  it('falls to beatmap then procedural when the analyser is unavailable', () => {
    expect(selectProvider({ ...base, localPlaying: true, analyserAvailable: false, localHasBeatMap: true })).toBe('beatmap')
    expect(selectProvider({ ...base, localPlaying: true, analyserAvailable: false })).toBe('procedural')
  })
  it('uses beatmap for a known Spotify track, procedural otherwise', () => {
    expect(selectProvider({ ...base, spotifyPlaying: true, spotifyHasBeatMap: true })).toBe('beatmap')
    expect(selectProvider({ ...base, spotifyPlaying: true })).toBe('procedural')
  })
  it('is idle when nothing plays', () => {
    expect(selectProvider(base)).toBe('idle')
  })
  it('local playback wins over Spotify', () => {
    expect(selectProvider({ ...base, localPlaying: true, spotifyPlaying: true, spotifyHasBeatMap: true })).toBe('live')
  })
})

describe('selectProvider mic', () => {
  const base = { localPlaying: true, analyserAvailable: true, localHasBeatMap: true, spotifyPlaying: true, spotifyHasBeatMap: true }
  it('mic wins over everything when on', () => {
    expect(selectProvider({ ...base, micOn: true })).toBe('mic')
    expect(selectProvider({ localPlaying: false, analyserAvailable: false, localHasBeatMap: false, spotifyPlaying: false, spotifyHasBeatMap: false, micOn: true })).toBe('mic')
  })
  it('off or absent changes nothing', () => {
    expect(selectProvider({ ...base, micOn: false })).toBe('live')
    expect(selectProvider(base)).toBe('live')
  })
})
