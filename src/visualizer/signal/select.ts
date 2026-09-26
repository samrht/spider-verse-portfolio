// Provider selection table from the spec §3. Pure so it is trivially
// tested; `useSignal` feeds it store state and instantiates the winner.

export type ProviderKind = 'mic' | 'live' | 'beatmap' | 'procedural' | 'idle'

export interface SelectInput {
  micOn?: boolean
  localPlaying: boolean
  analyserAvailable: boolean
  localHasBeatMap: boolean
  spotifyPlaying: boolean
  spotifyHasBeatMap: boolean
}

export function selectProvider(i: SelectInput): ProviderKind {
  // Mic mode is an explicit takeover (listen-modes spec §2).
  if (i.micOn) return 'mic'
  if (i.localPlaying) {
    if (i.analyserAvailable) return 'live'
    return i.localHasBeatMap ? 'beatmap' : 'procedural'
  }
  if (i.spotifyPlaying) return i.spotifyHasBeatMap ? 'beatmap' : 'procedural'
  return 'idle'
}
