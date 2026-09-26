import type { JSX } from 'react'
import type { Universe } from '../../../store/universeStore'
import type { DeckControls } from '../useDeckControls'
import { GlitchCassette } from './GlitchCassette'

export interface FaceProps { c: DeckControls }
export type Face = (p: FaceProps) => JSX.Element

// Universe → deck object (spec §4.2). Tasks 5–7 swap in the other faces.
export const FACES: Record<Universe, Face> = {
  '616': GlitchCassette,
  mcu: GlitchCassette,
  toon: GlitchCassette,
  verse: GlitchCassette,
}

export const FACE_IDS: Record<Universe, string> = {
  '616': 'glitch-cassette',
  mcu: 'glitch-cassette',
  toon: 'glitch-cassette',
  verse: 'glitch-cassette',
}
