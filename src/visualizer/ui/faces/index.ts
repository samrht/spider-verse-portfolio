import type { JSX } from 'react'
import type { Universe } from '../../../store/universeStore'
import type { DeckControls } from '../useDeckControls'
import { GlitchCassette } from './GlitchCassette'
import { InkedCassette } from './InkedCassette'
import { HudRing } from './HudRing'
import { Boombox } from './Boombox'

export interface FaceProps { c: DeckControls }
export type Face = (p: FaceProps) => JSX.Element

// Universe → deck object (spec §4.2). Tasks 5–7 swap in the other faces.
export const FACES: Record<Universe, Face> = {
  '616': InkedCassette,
  mcu: HudRing,
  toon: Boombox,
  verse: GlitchCassette,
}

export const FACE_IDS: Record<Universe, string> = {
  '616': 'inked-cassette',
  mcu: 'hud-ring',
  toon: 'boombox',
  verse: 'glitch-cassette',
}
